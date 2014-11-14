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
