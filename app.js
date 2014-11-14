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

  window.app.factory('JolokiaClient',
  	['$http',
    function ($http) {
      var _client = {},
          _baseUrl;

      _client.setServer = function(server, port){
        port = port || '8080';
        server = server || 'localhost';

        var url = [server, ':', port, '/jolokia'];
        $http.get(url).then(
          function (){
            _baseUrl = url;
          }
        );
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

  window.app.controller('HomeCtrl',
    ['$scope', 'JolokiaClient',
    function ($scope, JolokiaClient) {

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
      $scope.sampleData = [{
        "id": "ajson1",
        "parent": "#",
        "text": "Simple root node"
      }, {
        "id": "ajson2",
        "parent": "#",
        "type": "folder",
        "text": "Root node 2"
      }, {
        "id": "ajson3",
        "parent": "ajson2",
        "text": "Child 1"
      }, {
        "id": "ajson4",
        "parent": "ajson2",
        "text": "Child 2"
      }];

      // directive doesn't pick up initial data without this
      setTimeout( function(){
        $scope.$apply();
      }, 0);
    }
    ]);
}());
