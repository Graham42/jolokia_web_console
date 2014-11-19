(function() {
  'use strict';

  window.app = angular.module('jolokiaWebConsole', []);

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
      $scope.jsTreeConfig = {};

      $scope.nodeDetails = {
        desc: 'Select a node to see details about it.'
      };

      $scope.nodeSelected = function(e, data) {
        //http://jimhoskins.com/2012/12/17/angularjs-and-apply.html//
        $scope.$apply(function() {
          var original = data.node.original;
          if (original.isLeaf) {
            JolokiaClient.getAttribute(original.parentName + ':' + original.text).then(
              function (response){
                $scope.nodeDetails.attrs = response;
              }
            );
            $scope.nodeDetails.desc = original.details.desc;
          } else {
            $scope.nodeDetails = {
              desc: 'No details available, select another node.'
            };
          }
        });
      };
      $scope.jsTreeEvents = {
        'select_node.jstree': $scope.nodeSelected
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
                  $scope.jsTreeConfig = {
                    'types': $scope.treeTypesConfig,
                    'plugins': ['sort', 'types'],
                    'core': {
                      'data': $scope.treeData
                    }
                  };
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

  app.directive('jsTree',
    [function () {
      var _d = {
        restrict: 'E',
        scope: {
          'config': '=',
          'treeEvents': '='
        },
        _setEvents: function(s, e, a) {
          if (a.treeEvents) {
            for (var evt in s.treeEvents){
              if (s.treeEvents.hasOwnProperty(evt)){
                _d._tree.on(evt, s.treeEvents[evt]);
              }
            }
          }
        },
        link: function (scope, element, attrs) {
          scope.$watch('config', function() {
            $(element).jstree('destroy');
            _d._tree = $(element).jstree(scope.config);
            _d._setEvents(scope, element, attrs);
          }, true);
        }
      };
      return _d;
    }]
  );
}());
