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
  	['$q',
    function ($q) {
      var _client = {},
          j4p;


      _client.list = function(path) {
        if (!j4p) throw "Server not set";
        var _p = $q.defer();
        j4p.list(
          path,
          {
            success: function(response) {
              _p.resolve(response);
            },
            error: function(response) {
              _p.reject(response);
            },
            ajaxError: function(response) {
              _p.reject(response);
            }
          }
        );
        return _p.promise;
      };


      _client.getAttribute = function (mbean, attribute, path) {
        return j4p.getAttribute(mbean, attribute, path);
      };


      _client.setServer = function(server){
        server = server || 'localhost';

        var url = ['http://', server, ':', '8080', '/jolokia'].join('');
        j4p = new Jolokia(url);
        var _p = $q.defer();
        j4p.version(
          {
            timeout: 3000,
            success: function(response) {
              _p.resolve(response);
            },
            error: function(response) {
              _p.reject(response);
            },
            ajaxError: function(response) {
              _p.reject(response);
            }
          }
        );
        return _p.promise;
      };

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

      $scope.nodeDetails = {
        desc: 'Select a node to see details about it.'
      };

      $scope.nodeSelected = function(e, data) {
        //http://jimhoskins.com/2012/12/17/angularjs-and-apply.html//
        $scope.$apply(function() {
          var original = data.node.original;
          if (original.isLeaf) {
            $scope.nodeDetails.attrs = JolokiaClient.getAttribute(original.parentName + ':' + original.text);
            $scope.nodeDetails.desc = original.details.desc;
          } else {
            $scope.nodeDetails = {
              desc: 'No details available, select another node.'
            };
          }
        });
      };

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

                  // process root tree
                  var idCounter = 0;
                  function listNode(name, node, parentId, parentName){
                    parentId = parentId || '#';
                    var resultList = [];
                    //self
                    var id = 'node' + idCounter++;
                    var isLeaf = node.hasOwnProperty('desc');
                    var localNode = {
                      id: id,
                      type: (isLeaf) ? 'file' : 'folder',
                      parent: parentId,
                      parentName: parentName,
                      text: name,
                      isLeaf: isLeaf
                    };
                    if (isLeaf) localNode.details = node;
                    resultList.push(localNode);
                    if (!isLeaf){
                      //children
                      Object.keys(node).forEach(function (key) {
                        resultList = resultList.concat(listNode(key, node[key], id, name));
                      });
                    }
                    return resultList;
                  }

                  $scope.treeData = [];
                  Object.keys(response).forEach(function (key) {
                    $scope.treeData = $scope.treeData.concat(listNode(key, response[key]));
                  });
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
