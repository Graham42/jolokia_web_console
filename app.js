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
      var auth;

      function asyncWrapper(fn){

        return function(){
          var args = [];
          for (var i = 0; i < fn.length; i++){
            args[i] = arguments[i] || null;
          }
          var _p = $q.defer();
          var opts;
          if (fn.name === 'execute' || !args[args.length-1])
            opts = {};
          else
            opts = args[args.length-1];
          opts.success = function (response) {
            _p.resolve(response);
          };
          opts.error = function (response) {
            _p.reject(response);
          };
          opts.ajaxError = function (response) {
            _p.reject(response);
          };
          if (auth){
            opts.username = auth.user;
            opts.password = auth.pwd;
            opts.method = 'GET';
            opts.jsonp = true;
          }
          if (fn.name === 'execute')
            args[args.length] = opts;
          else
            args[args.length-1] = opts;
          fn.apply(this, args);
          return _p.promise;
        };
      }

      function setServer(server, user, pwd){
        server = server || 'localhost';
        auth = (user && pwd) ? {user: user, pwd: pwd} : null;

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

      $scope.nodeDetails = "";

      $scope.nodeSelected = function(e, data) {
        var getrArgs = data.node.original.getrArgs;
        //http://jimhoskins.com/2012/12/17/angularjs-and-apply.html//
        $scope.$apply(function() {
          $scope.nodeDetails = 'Loading details...';
          JolokiaClient.getAttribute(getrArgs[0], getrArgs[1], getrArgs[2]).then(
            function (response){
              for(var key in response){
                if(typeof response[key] === 'object' &&
                    response[key] !== null &&
                    !Array.isArray(response[key])){
                  response[key] = "// Complex Object, view in tree //";
                }
              }
              $scope.nodeDetails = JSON.stringify(response, null, 2);
            },
            function (response) {
              if (response.status >= 400 && response.status < 500){
                $scope.nodeDetails = 'No details available, select another node.';
              } else {
                $scope.nodeDetails = 'Failed to load details.';
              }
            }
          );
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

          JolokiaClient.setServer($scope.hostname, $scope.username, $scope.password).then(
            function () {
              $scope.nodeDetails = 'Select a node to see details about it.';
              $scope.jsTreeConfig = {
                'types': $scope.treeTypesConfig,
                'plugins': ['sort', 'types'],
                'core': {
                  'data': function (node, cb) {
                    if(node.id === "#") {
                      // root
                      JolokiaClient.list('', { maxDepth: 2 }).then(
                        function (response) {
                          var result = Object.keys(response).map(function (item) {
                            return {
                              text: item,
                              type: 'folder',
                              children: (typeof response[item] === 'object' && response[item] !== null),
                              lspath: item,
                              getrArgs: [item]
                            };
                          });
                          cb(result);
                        }
                      ).finally(function () {
                        $('#loadingProgress').modal('hide');
                      });
                    } else {
                      // generic
                      JolokiaClient.list(node.original.lspath, { maxDepth: 2 }).then(
                        function (response) {
                          var result = Object.keys(response).map(function (item) {
                            if (['attr', 'op', 'desc'].indexOf(item) !== -1)
                              return;

                            var isFolder = (typeof response[item] === 'object' &&
                                              response[item] !== null);
                            var newNode = {
                              text: item,
                              type: isFolder ? 'folder' : 'file',
                              children: isFolder,
                              lspath: node.original.lspath + '/' + item
                            };
                            if (node.original.getrArgs[0].indexOf(':') === -1){
                              newNode.getrArgs = [node.original.getrArgs[0] + ':' + item];
                            } else {
                              newNode.getrArgs = node.original.getrArgs.concat([item]);
                            }
                            return newNode;
                          });
                          for(var i = 0; i < result.length;){
                            if (result[i] === undefined)
                              result.splice(i, 1);
                            else
                              i++;
                          }

                          if (response.attr){
                            var attrNodes = Object.keys(response.attr).map(function (item) {
                              return {
                                text: item,
                                type: 'file',
                                children: false,
                                getrArgs: node.original.getrArgs.concat([item])
                              };
                            });
                            result = result.concat(attrNodes);
                          }

                          cb(result);
                        }
                      );
                    }
                  }
                }
              };
            },

            function () {
              alertBox('Could not connect to "' + $scope.hostname + '".', 'CRITICAL');
              $('#loadingProgress').modal('hide');
            }
          );
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
