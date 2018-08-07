var request = require('request');
var NodeHelper = require('node_helper');

module.exports = NodeHelper.create({
  start: function() {
    console.log('Starting node helper: ' + this.name);
  },

  socketNotificationReceived: function(notification, config) {
    console.log(
      'Notification: ' + notification + ' Config: ' + JSON.stringify(config)
    );

    if (notification === 'GET_SOLAR_DATA') {
      var self = this;
      var url = '';
      if (config.unit === 'HOUR') {
        url =
          'https://monitoringapi.solaredge.com/site/' +
          config.siteId +
          '/power?endTime=' +
          config.end +
          '&startTime=' +
          config.start +
          '&api_key=' +
          config.apiKey;
      } else {
        url =
          'https://monitoringapi.solaredge.com/site/' +
          config.siteId +
          '/energy?timeUnit=' +
          config.unit +
          '&endDate=' +
          config.end +
          '&startDate=' +
          config.start +
          '&api_key=' +
          config.apiKey;
      }

      console.log('MMM-SolarEdge node_helper Sending Request: ' + url);
      request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          var jsonData = JSON.parse(body);
          self.sendSocketNotification('SOLAR_DATA', {
            id: config.id,
            data: jsonData
          });
        }
      });
    }
  }
});
