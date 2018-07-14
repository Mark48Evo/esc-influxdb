import SystemESC from '@mark48evo/system-esc';
import { InfluxDB, FieldType } from 'influx';
import amqplib from 'amqplib';
import Debug from 'debug';

const debug = Debug('esc:influxdb');

const config = {
  influxHost: process.env.INFLUXDB_HOST || 'localhost',
  influxDB: process.env.INFLUXDB_DB || 'mark48evo',
  host: process.env.RABBITMQ_HOST || 'amqp://localhost',
};

const influx = new InfluxDB({
  host: config.influxHost,
  database: config.influxDB,
  schema: [
    {
      measurement: 'esc',
      fields: {
        tempMOSFET: FieldType.FLOAT,
        tempMOTOR: FieldType.FLOAT,
        currentBATTERY: FieldType.FLOAT,
        currentMOTOR: FieldType.FLOAT,
        id: FieldType.FLOAT,
        iq: FieldType.FLOAT,
        duty: FieldType.FLOAT,
        rpm: FieldType.FLOAT,
        voltage: FieldType.FLOAT,
        ampHoursConsumed: FieldType.FLOAT,
        ampHoursCharged: FieldType.FLOAT,
        wattHoursConsumed: FieldType.FLOAT,
        wattHoursCharged: FieldType.FLOAT,
        tachometerValue: FieldType.FLOAT,
        tachometerABS: FieldType.FLOAT,
      },
      tags: [
        'device',
        'faultCode',
      ],
    },
  ],
});

async function main() {
  await influx.getDatabaseNames()
    .then(async (names) => {
      if (!names.includes(config.influxDB)) {
        debug(`Creating InfluxDB "${config.influxDB}" database`);

        await influx.createDatabase(config.influxDB);

        return Promise.resolve();
      }

      return Promise.resolve();
    });

  const connect = await amqplib.connect(config.host);
  const channel = await connect.createChannel();

  const systemESC = await SystemESC(channel);

  systemESC.on('stats', (data) => {
    const fields = {
      tempMOSFET: data.temp.mosfet,
      tempMOTOR: data.temp.motor,
      currentBATTERY: data.current.battery,
      currentMOTOR: data.current.motor,
      id: data.id,
      iq: data.iq,
      duty: data.dutyNow,
      rpm: data.rpm,
      voltage: data.voltage,
      ampHoursConsumed: data.ampHours.consumed,
      ampHoursCharged: data.ampHours.charged,
      wattHoursConsumed: data.wattHours.consumed,
      wattHoursCharged: data.wattHours.charged,
      tachometerValue: data.tachometer.value,
      tachometerABS: data.tachometer.abs,
    };

    const tags = {
      device: 'left',
      faultCode: data.faultCode,
    };

    influx.writePoints([
      {
        measurement: 'esc',
        tags,
        fields,
        timestamp: new Date(data.timestamp),
      },
    ]).catch((err) => {
      console.error(`InfluxDB Error: "${err.message()}" "${err.stack}"`);
    });
  });
}

main();
