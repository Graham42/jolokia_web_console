/**
Copyright (c) 2014 Graham McGregor

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
(function() {
  'use strict';

  window.app = angular.module('jolokiaWebConsole', ['angularBootstrapNavTree']);

  app.factory('JolokiaClient',
  	['$q',
    function ($q) {
      var ASYNC_FUNCS = [
        'getAttribute',
        'list',
        'search',
        'setAttribute',
        'version'
      ];
      var _client = {};

      function asyncWrapper(fn){

        return function(){
          var args = [];
          for (var i = 0; i < fn.length; i++){
            args[i] = arguments[i] || null;
          }
          var _p = $q.defer();
          args[args.length-1] = args[args.length-1] || {};
          args[args.length-1].success = function (response) {
            _p.resolve(response);
          };
          args[args.length-1].error = function (response) {
            _p.reject(response);
          };
          args[args.length-1].ajaxError = function (response) {
            _p.reject(response);
          };
          fn.apply(this, args);
          return _p.promise;
        };
      }

      function setServer(server){
        server = server || 'localhost';

        // TODO more flexible url input
        var url = ['http://', server, ':', '8080', '/jolokia'].join('');
        var j4p = new Jolokia(url);

        ASYNC_FUNCS.forEach(function (funcName){
          j4p[funcName] = asyncWrapper(j4p[funcName]);
        });

        return j4p.version().then(
          function () {
            for(var key in j4p)
              _client[key] = j4p[key];
          }
        );
      }

      _client.setServer = setServer;

      return _client;
    }]
  );

  app.controller('HomeCtrl',
    ['$scope', '$q', 'JolokiaClient',
    function ($scope, $q, JolokiaClient) {

      function alertBox(message, severity){
        $scope.alertMessage = message;
        switch(severity) {
            case 'CRITICAL':
                $scope.alertLevel = 'alert-danger';
                break;
            case 'WARNING':
                $scope.alertLevel = 'alert-warning';
                break;
            case 'SUCCESS':
                $scope.alertLevel = 'alert-success';
                break;
            default:
                $scope.alertLevel = 'alert-info';
        }
      }

      $scope.navTreeData = [];

      $scope.setServer = function () {
        $scope.alertMessage = '';

        if (!$scope.hostname) {
          alertBox('Please enter a hostname or ip address to connect to.', 'WARNING');
        } else {
          $('#loadingProgress').modal();

          JolokiaClient.setServer($scope.hostname).then(
            function () {
              return JolokiaClient.list('').then(
                function (response){

                  var z = 0;
                  function listNode(nodes){
                    if (z++ > 1500) return [];
                    var results = [];
                    Object.keys(nodes).forEach(function (key) {
                      if (typeof nodes[key] === 'object' && nodes[key]){
                        results.push({
                          label: key,
                          children: listNode(nodes[key])
                        });
                      } else {
                        results.push(key);
                      }

                    });
                    return results;
                  }

                  $scope.navTreeData = listNode(response);

                  console.log($scope.navTreeData);
                },

                function (){
                  alertBox('Failed to get server data, please try again.', 'CRITICAL');
                }
              );
            },

            function () {
              alertBox('Could not connect to "' + $scope.hostname + '".', 'CRITICAL');
            }
          ).finally(function () {
            $('#loadingProgress').modal('hide');
          });
        }
      };
    }
    ]);
}());
