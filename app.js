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

        var url = [server, ':', '8080', '/jolokia'];
        var promise = $http.get(url).then(
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
            // failed...
          }
        );
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
        // show loading symbol
        JolokiaClient.setServer($scope.hostname).then(
          function (response) {
            initRootTree();
          },
          function () {
            // failed...
          }
        );

      };
    }
    ]);
}());
