/**
 * Copyright 2014 Peter Bernhardt, et. al.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use
 * this file except in compliance with the License. You may obtain a copy of the
 * License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
(function () {
    'use strict';

    // Define the common module 
    // Contains services:
    //  - common
    //  - logger
    //  - spinner
    var commonModule = angular.module('common', []);

    // Must configure the common service and set its 
    // events via the commonConfigProvider
    commonModule.provider('commonConfig', function () {
        this.config = {
            // These are the properties we need to set
            //controllerActivateSuccessEvent: '',
            //spinnerToggleEvent: ''
        };

        this.$get = function () {
            return {
                config: this.config
            };
        };
    });

    commonModule.factory('common',
        ['$http', '$q', '$rootScope', '$timeout', 'commonConfig', 'logger', common]);

    function common($http, $q, $rootScope, $timeout, commonConfig, logger) {
        var throttles = {};

        var service = {
            // common angular dependencies
            $broadcast: $broadcast,
            $http: $http,
            $q: $q,
            $timeout: $timeout,
            // generic
            activateController: activateController,
            createSearchThrottle: createSearchThrottle,
            debouncedThrottle: debouncedThrottle,
            generateUUID: generateUUID,
            isAbsoluteUri: isAbsoluteUri,
            isNumber: isNumber,
            logger: logger, // for accessibility
            makeHumanName: makeHumanName,
            mapDisplayToCoding: mapDisplayToCoding,
            removeNullProperties: removeNullProperties,
            textContains: textContains,
            unexpectedOutcome: unexpectedOutcome
        };

        return service;

        function activateController(promises, controllerId) {
            return $q.all(promises).then(function (eventArgs) {
                var data = { controllerId: controllerId };
                $broadcast(commonConfig.config.controllerActivateSuccessEvent, data);
            });
        }

        function $broadcast() {
            return $rootScope.$broadcast.apply($rootScope, arguments);
        }

        function createSearchThrottle(viewmodel, list, filteredList, filter, delay) {
            // After a delay, search a view-model's list using
            // a filter function, and return a filteredList.

            // custom delay or use default
            delay = +delay || 300;
            // if only vm and list parameters were passed, set others by naming convention 
            if (!filteredList) {
                // assuming list is named sessions, filteredList is filteredSessions
                filteredList = 'filtered' + list[0].toUpperCase() + list.substr(1).toLowerCase(); // string
                // filter function is named sessionFilter
                filter = list + 'Filter'; // function in string form
            }

            // create the filtering function we will call from here
            var filterFn = function () {
                // translates to ...
                // vm.filteredSessions 
                //      = vm.sessions.filter(function(item( { returns vm.sessionFilter (item) } );
                viewmodel[filteredList] = viewmodel[list].filter(function (item) {
                    return viewmodel[filter](item);
                });
            };

            return (function () {
                // Wrapped in outer IFFE so we can use closure 
                // over filterInputTimeout which references the timeout
                var filterInputTimeout;

                // return what becomes the 'applyFilter' function in the controller
                return function (searchNow) {
                    if (filterInputTimeout) {
                        $timeout.cancel(filterInputTimeout);
                        filterInputTimeout = null;
                    }
                    if (searchNow || !delay) {
                        filterFn();
                    } else {
                        filterInputTimeout = $timeout(filterFn, delay);
                    }
                };
            })();
        }

        function debouncedThrottle(key, callback, delay, immediate) {
            // Perform some action (callback) after a delay. 
            // Track the callback by key, so if the same callback 
            // is issued again, restart the delay.

            var defaultDelay = 1000;
            delay = delay || defaultDelay;
            if (throttles[key]) {
                $timeout.cancel(throttles[key]);
                throttles[key] = undefined;
            }
            if (immediate) {
                callback();
            } else {
                throttles[key] = $timeout(callback, delay);
            }
        }

        function isNumber(val) {
            // negative or positive
            return /^[-]?\d+$/.test(val);
        }

        function textContains(text, searchText) {
            return text && -1 !== text.toLowerCase().indexOf(searchText.toLowerCase());
        }

        function generateUUID() {
            var d = new Date().getTime();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
                function (c) {
                    var r = (d + Math.random() * 16) % 16 | 0;
                    d = Math.floor(d / 16);
                    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
                });
        }

        function isAbsoluteUri(input) {
            // ^(?:[a-z]+:)?//
            //    ^ - beginning of the string
            //        (?: - beginning of a non-captured group
            //            [a-z]+ - any character of 'a' to 'z' 1 or more times
            //            : - string (colon character)
            //    )? - end of the non-captured group. Group appearing 0 or 1 times
            //// - string (two forward slash characters)
            //        'i' - non case-sensitive flag
            var r = new RegExp('^(?:[a-z]+:)?//', 'i');
            return r.test(input);
        }

        function makeHumanName(nameText) {
            var humanName = {
                "given": [],
                "family": [],
                "text": nameText
            };
            if (nameText) {
                var nameParts = nameText.split(" ");
                var len = parseInt(nameParts.length, 10);
                var mid = parseInt(Math.ceil(len / 2), 10);
                for (var i = 0; i < mid; i++) {
                    humanName.given.push(nameParts[i]);
                    if (nameParts[mid + i]) {
                        if (len % 2 > 0 && i > 0) {
                            humanName.family.push(nameParts[mid + i]);
                        } else {
                            humanName.family.push(nameParts[mid + i]);
                        }
                    }
                }
            }
            return humanName;
        }

        function mapDisplayToCoding(display, coding) {
            var foundItem;
            for (var i = 0; i < coding.length; i++) {
                if (display === coding[i].display) {
                    foundItem = coding[i];
                    break;
                }
            }
            return foundItem;
        }

        function removeNullProperties(target) {
            Object.keys(target).map(function (key) {
                if (target[key] instanceof Object) {
                    if (!Object.keys(target[key]).length && typeof target[key].getMonth !== 'function') {
                        delete target[key];
                    } else {
                        removeNullProperties(target[key]);
                    }
                } else if (target[key] === null) {
                    delete target[key];
                }
            });
            return target;
        }

        function unexpectedOutcome(error) {
            var message = 'Unexpected response from server<br/>';
            if (error.status) {
                message = message + 'HTTP Status: ' + error.status;
            }
            if (error.outcome && error.outcome.issue) {
                _.forEach(error.outcome.issue, function (item) {
                    message = message + '<br/>' + item.severity + ' - ' + item.details;
                })
            }
            return message;
        }
    }
})();