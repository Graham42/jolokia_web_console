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

  window.app = angular.module('jolokiaWebConsole', ['jsTree.directive']);

  app.factory('JolokiaClient',
  	['$http',
    function ($http) {
      var _client = {},
          _baseUrl;

      _client.setServer = function(server){
        server = server || 'localhost';

        var url = ['http://', server, ':', '8080', '/jolokia'].join('');
        var promise = $http.get(url, {timeout: 5000}).then(
          function (){
            _baseUrl = url;
          }
        );
        return promise;
      };

      _client.list = function(path) {
        if (!_baseUrl) throw "Host not set";
        return $http.get(_baseUrl + '/list/' + encodeURIComponent(path));
      };

      _client.read = function(path) {
        if (!_baseUrl) throw "Host not set";
        return $http.get(_baseUrl + '/read/' + encodeURIComponent(path));
      };

      return _client;
    }]
  );

  app.controller('HomeCtrl',
    ['$scope', 'JolokiaClient',
    function ($scope, JolokiaClient) {

      function initRootTree(){
        JolokiaClient.list('').then(
          function (response){
            //TODO need to process response
            // response.data.value is the root list
            // $scope.treeData = response.data.value;
          },
          function (){
            alert('Failed to get server data, please try again.', 'CRITICAL');
          }
        );
      }

      function alert(message, severity){
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

      $scope.treeTypesConfig = {
        "default": {
          "icon": "/images/file.png"
        },
        "folder": {
          "icon": "/images/folder.png"
        },
        "file": {
          "icon": "/images/file.png"
        }
      };

      $scope.treeData = [];

      // directive doesn't pick up initial data without this
      setTimeout( function(){
        $scope.$apply();
      }, 0);

      $scope.setServer = function () {
        if (!$scope.hostname) {
          alert('Please enter a hostname or ip address to connect to.', 'WARNING');
        } else {
          $('#loadingProgress').modal();
          JolokiaClient.setServer($scope.hostname).then(
            function (response) {
              initRootTree();
            },
            function () {
              alert('Could not connect to "' + $scope.hostname + '".', 'CRITICAL');
            }
          ).finally(function () {
            $('#loadingProgress').modal('hide');
          });
        }
      };
    }
    ]);
}());
