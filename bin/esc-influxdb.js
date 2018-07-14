'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var SystemESC = _interopDefault(require('@mark48evo/system-esc'));
var influx = require('influx');
var amqplib = _interopDefault(require('amqplib'));
var Debug = _interopDefault(require('debug'));
var pmx = _interopDefault(require('pmx'));

const debug = Debug('esc:influxdb');
pmx.init({});
const messagesProcessed = pmx.probe().counter({
  name: 'ESC Messages Processed'
});
const messagesProcessedPerMin = pmx.probe().meter({
  name: 'msg/min',
  samples: 1,
  timeframe: 60
});
const config = {
  influxHost: process.env.INFLUXDB_HOST || 'localhost',
  influxDB: process.env.INFLUXDB_DB || 'mark48evo',
  host: process.env.RABBITMQ_HOST || 'amqp://localhost'
};
const influx$1 = new influx.InfluxDB({
  host: config.influxHost,
  database: config.influxDB,
  schema: [{
    measurement: 'esc',
    fields: {
      tempMOSFET: influx.FieldType.FLOAT,
      tempMOTOR: influx.FieldType.FLOAT,
      currentBATTERY: influx.FieldType.FLOAT,
      currentMOTOR: influx.FieldType.FLOAT,
      id: influx.FieldType.FLOAT,
      iq: influx.FieldType.FLOAT,
      duty: influx.FieldType.FLOAT,
      rpm: influx.FieldType.FLOAT,
      voltage: influx.FieldType.FLOAT,
      ampHoursConsumed: influx.FieldType.FLOAT,
      ampHoursCharged: influx.FieldType.FLOAT,
      wattHoursConsumed: influx.FieldType.FLOAT,
      wattHoursCharged: influx.FieldType.FLOAT,
      tachometerValue: influx.FieldType.FLOAT,
      tachometerABS: influx.FieldType.FLOAT
    },
    tags: ['device', 'faultCode']
  }]
});

async function main() {
  await influx$1.getDatabaseNames().then(async names => {
    if (!names.includes(config.influxDB)) {
      debug(`Creating InfluxDB "${config.influxDB}" database`);
      await influx$1.createDatabase(config.influxDB);
      return Promise.resolve();
    }

    return Promise.resolve();
  });
  const connect = await amqplib.connect(config.host);
  const channel = await connect.createChannel();
  const systemESC = await SystemESC(channel);
  systemESC.on('stats', data => {
    messagesProcessed.inc();
    messagesProcessedPerMin.mark();
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
      tachometerABS: data.tachometer.abs
    };
    const tags = {
      device: 'left',
      faultCode: data.faultCode
    };
    influx$1.writePoints([{
      measurement: 'esc',
      tags,
      fields,
      timestamp: new Date(data.timestamp)
    }]).catch(err => {
      console.error(`InfluxDB Error: "${err.message()}" "${err.stack}"`);
    });
  });
}

main();
//# sourceMappingURL=esc-influxdb.js.map
