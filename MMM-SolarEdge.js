Module.register('MMM-SolarEdge', {
  defaults: {
    width: 400,
    height: 400,
    siteId: '',
    apiKey: '',
    unit: 'HOUR',
    unitsBack: 24,
    refreshInterval: 1000 * 60 * 30, // ms * s * min,
    xAxisSkipNumber: 1
  },

  getScripts: function() {
    return [
      'modules/' + this.name + '/node_modules/chartist/dist/chartist.min.js',
      'modules/' + this.name + '/node_modules/lodash/lodash.min.js',
      'modules/' + this.name + '/node_modules/moment/moment.js'
    ];
  },

  getStyles: function() {
    // the css contains the make grayscale code
    return [
      'modules/' + this.name + '/node_modules/chartist/dist/chartist.min.css',
      'solarEdge.css'
    ];
  },

  start: function() {
    Log.info('Starting module: ' + this.name + ' ' + this.identifier);
    this.config = Object.assign({}, this.defaults, this.config);
    this.config.id = this.identifier;
    this.resume();
  },

  getData: function() {
    Log.info('SolarEdge: getting data ' + this.identifier);
    var now = moment();
    if (this.config.unit === 'HOUR') {
      this.config.end = now.format('YYYY-M-D HH:mm:ss');
      this.config.start = now
        .subtract(this.config.unitsBack, 'h')
        .format('YYYY-M-D HH:mm:ss');
    } else {
      var unit = 'd';
      if (this.config.unit === 'WEEK') {
        unit = 'w';
      } else if (this.config.unit === 'MONTH') {
        unit = 'M';
      } else if (this.config.unit === 'YEAR') {
        unit = 'y';
      }
      this.config.end = now.format('YYYY-M-D');
      this.config.start = now
        .subtract(this.config.unitsBack, unit)
        .format('YYYY-M-D');
    }

    this.sendSocketNotification('GET_SOLAR_DATA', this.config);
  },

  //Handle node helper response
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'SOLAR_DATA' && payload.id === this.identifier) {
      this.loaded = true;
      var self = this;

      var values = payload.data.energy
        ? payload.data.energy.values
        : payload.data.power.values;

      var labels = _.map(values, function(value) {
        return self.config.unit === 'HOUR'
          ? moment(value.date).format('HH:mm')
          : moment(value.date).format('M/D');
      });

      var data2 = _.map(values, function(value) {
        if (value.value && self.config.unit === 'HOUR') {
          return value.value / 1000;
        }
        return value.value / 1000;
      });
      var data = {
        labels: labels, //['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        series: [data2] //[[5, 2, 4, 2, 0]]
      };

      var options = {
        width: this.config.width,
        height: this.config.height,
        low: 0
      };
      var name = '#ctChart' + this.identifier;
      if (this.config.unit === 'HOUR') {
        options.showArea = true;
        options.axisX = {
          labelInterpolationFnc: function skipLabels(value, index, labels) {
            if (labels.length > 60) {
              return index % self.config.xAxisSkipNumber === 0 ? value : null;
            } else {
              return value;
            }
          }
        };
        new Chartist.Line(name, data, options);
      } else {
        new Chartist.Bar(name, data, options);
      }
    }
  },

  getDom: function() {
    // Create wrapper element
    // const wrapperEl = document.createElement('div');
    const div = document.createElement('div');
    div.id = 'ctChart' + this.identifier;
    div.className = 'ct-chart';
    // wrapperEl.appendChild(div);
    return div;
  },

  suspend: function() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  resume: function() {
    this.getData();
    var self = this;
    this.timer = setInterval(function() {
      self.getData();
    }, self.config.refreshInterval);
  }
});
