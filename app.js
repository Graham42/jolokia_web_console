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
            // failed...
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
          // show loading symbol
          JolokiaClient.setServer($scope.hostname).then(
            function (response) {
              initRootTree();
            },
            function () {
              alert('Could not connect to "' + $scope.hostname + '".', 'CRITICAL');
            }
          );
        }
      };
    }
    ]);
}());
