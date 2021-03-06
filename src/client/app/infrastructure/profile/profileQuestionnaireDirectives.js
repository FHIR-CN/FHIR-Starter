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
    var app = angular.module('FHIRStarter');

    app.directive('fsQuestionnaireGroup', ['$compile', 'config',
        function($compile, config) {
            // Description: Process individual group of profile questionnaire data. This may be entered recursively for sub-groups.
            // Usage: <fs-questionnaire-group group="group" offset="2" cols="10" ng-model="vm.answers" value-sets="vm.valueSets" />
            var directiveDefinitionObject = {
                restrict: 'E',
                link: link,
                scope: {
                    group: '=?',
                    offset: '=',
                    cols: '=',
                    ngModel: '=',
                    valueSets: '=?'
                }
            };
            return directiveDefinitionObject;

            function link(scope, iElem, iAttrs) {
                var groupMembers;
                var typeValue = undefined;
                var fhirType = undefined;
                var newOffset = scope.offset + 1;
                var newCol = scope.cols - 1;

                if (scope.group.repeats) {
                    _.forEach(scope.group.question, function(item) {
                        var id = item.linkId;
                        if (angular.isDefined(groupMembers)) {
                            groupMembers = groupMembers + '..' + id;
                        } else {
                            groupMembers = id;
                        }
                    });
                }

                if (scope.group.extension) {
                    var groupType = _.find(scope.group.extension, {'url': 'http://www.healthintersections.com.au/fhir/Profile/metadata#type'});
                    if (groupType) {
                        typeValue = groupType.valueString;
                        if (_.contains(config.fhirPrimitiveTypes, typeValue)) {
                            fhirType = config.fhirTypes.Primitive;
                        } else if (_.contains(config.fhirComplexTypes, typeValue)) {
                            fhirType = config.fhirTypes.Complex;
                        } else if (_.contains(config.fhirResources, typeValue)) {
                            fhirType = config.fhirTypes.Resource;
                        }
                    }
                }

                var groupTemplate = '<div class="form-group col-md-12" >' +
                    '<legend>{{group.linkId | questionnaireLabel }}</legend>' +
                    '<span class="help-block">{{group.text || (group.extension | questionnaireFlyover)}}</span>' +
                    '<div class="controls col-md-' + scope.cols + ' col-md-offset-' + scope.offset + '" @groupIdToken>';

                if (scope.group && angular.isArray(scope.group.group)) {
                    groupTemplate = groupTemplate +
                        '    <data-fs-questionnaire-groups groups="group.group" data-ng-model="ngModel" value-sets="valueSets" offset="' + newOffset + '" cols="' + newCol + '"/>' +
                        '  </div>' +
                        '</div>';
                } else {
                    groupTemplate = groupTemplate +
                        '    <div data-ng-repeat="q in group.question">' +
                        '      <data-fs-questionnaire-question question="q" repeats="group.repeats" required="group.required" data-ng-model="ngModel" value-sets="valueSets" total-questions="' + (scope.group.question ? scope.group.question.length : 0) + '" group-type="' + fhirType + '"/>' +
                        '    </div>@repeatDirectiveToken' +
                        '  </div>' +
                        '</div>';
                }

                if (scope.group.repeats) {
                    groupTemplate = groupTemplate.replace('@groupIdToken', 'id="' + scope.group.linkId + '"');
                    var repeatDirective = '<fs-questionnaire-repeating-group group-id="' + scope.group.linkId + '" group-members="' + groupMembers + '" data-ng-model="ngModel" value-sets="valueSets" />';
                    groupTemplate = groupTemplate.replace('@repeatDirectiveToken', repeatDirective);
                } else {
                    groupTemplate = groupTemplate.replace('@groupIdToken', '');
                    groupTemplate = groupTemplate.replace('@repeatDirectiveToken', '');
                }

                $compile(groupTemplate)(scope, function(cloned) {
                    iElem.append(cloned);
                });
            }
        }
    ]);

    app.directive('fsQuestionnaireGroupList', ['$compile', '$filter',
        function($compile, $filter) {
            // Description: Manages the list of saved group items
            // Usage:  <fs-questionnaire-group-list items="listArray" group-id="groupId"/>
            var directiveDefinitionObject = {
                restrict: 'E',
                link: link,
                scope: {
                    items: "="
                }
            };
            return directiveDefinitionObject;

            function link(scope, iElem, iAttrs) {
                var listTemplate = '<div data-ng-show="items.length>0" class="col-md-12">' +
                    ' <form>' +
                    '   <legend>' + $filter('questionnaireLabel')(iAttrs.groupId) + ' list</legend> ' +
                    '   <table class="table table-responsive">' +
                    '     <tbody>' +
                    '       <tr data-ng-repeat="item in items"><td>{{item | renderObject }}</td><td><button data-ng-click="remove(item)">x</button></td>' +
                    '       </tr>' +
                    '     </tbody>' +
                    '   </table>' +
                    ' </form> ' +
                    '</div>';

                iElem.append($compile(listTemplate)(scope));

                scope.remove = function(item) {
                    _.remove(scope.items, function(i) {
                        return item.$$hashKey === i.$$hashKey;
                    });
                };
            }
        }
    ]);

    app.directive('fsQuestionnaireGroups', ['$compile', function ($compile) {
        // Description: Starting point for building profile questionnaire
        // Usage: <data-fs-questionnaire-groups groups="vm.questionnaire.group.group" offset="0" cols="12" ng-model="vm.answers" value-sets="valueSets" />
        var directiveDefinitionObject = {
            restrict: 'E',
            link: link,
            scope: {
                groups: '=',
                offset: '=',
                cols: '=',
                ngModel: '=',
                valueSets: '='
            }
        };
        return directiveDefinitionObject;

        function link(scope, iElem, iAttrs) {
            var newGrouping = '<data-fs-questionnaire-group data-ng-repeat="item in groups" data-ng-model="ngModel" value-sets="valueSets" group="item" offset="' + scope.offset + '" cols="' + scope.cols + '"/>';
            $compile(newGrouping)(scope, function (cloned) {
                iElem.replaceWith(cloned);
            });
        }
    }]);

    app.directive('fsQuestionnaireQuestion', ['$compile', '$filter', '$parse',
        function($compile, $filter, $parse) {
            // Description: Renders the HTML input element for a specific question
            // Usage:  <fs-questionnaire-question question="q" ng-model="vm.answers" value-sets="valueSets" />
            var directiveDefinitionObject = {
                restrict: 'E',
                link: link,
                scope: {
                    question: '=?',
                    repeats: '=?',
                    required: '=?',
                    ngModel: '=',
                    valueSets: '=?'
                }
            };
            return directiveDefinitionObject;
            // Question type / Extension valueString
            // -------------  ----------------------
            // choice        / CodeableConcept - needs value set lookup - must also have options property for question of type choice (if not, make this a simple text input)
            // open-choice   / CodeableConcept - needs valueset and drop down must also have options property for question of type choice (if not, make this a simple text input)
            // reference     / ResourceReference - valueString will identify resource type in ext with url = http://www.healthintersections.com.au/fhir/Profile/metadata#reference
            // fhirPrimitives will be handled as strings, dates, numbers or booleans
            // need special handling for polymorphic properties (with [x] in linkId)
            function link(scope, iElem, iAttrs) {
                var ngModelGet = scope.ngModel;
                var question = scope.question;
                var linkId = setLinkId(question.linkId, scope.repeats);
                setModel(ngModelGet, linkId.replace('[x]', ''), scope.repeats, null);

                var template =
                    '  <input requiredToken@' +
                        '    type="' + $filter('questionnaireInputType')(question.type) + '" ' +
                        '    id="' + linkId + '" ' +
                        '    class="classToken@" ' +
                        '    placeholder="' + question.text + '">@repeatToken' +
                        '</div>';

                if (question.type === 'choice') {
                    var vsReference;
                    if (angular.isDefined(question.options)) {
                        vsReference = question.options.reference;
                    }
                    if (angular.isDefined(vsReference)) {
                        vsReference = vsReference.replace('#', '');
                        if (angular.isArray(scope.valueSets)) {
                            var valueSet;
                            _.forEach(scope.valueSets, function(vs) {
                                if (vs.id === vsReference) {
                                    valueSet = vs;
                                }
                            });
                            var options = [];
                            _.forEach(valueSet.expansion.contains, function(item) {
                                var coding = {};
                                coding.code = item.code;
                                coding.display = item.display;
                                coding.system = item.system;
                                options.push(coding);
                            });
                            scope.valueSet = options;
                            console.log(scope.valueSet);
                            template =
                                ' <select ' +
                                    '   class="form-control"' +
                                    '   id="' + linkId + '"> ' +
                                    '    <option data-ng-repeat="coding in valueSet" value="{{ coding }}" >' +
                                    '             {{coding.display || ""}}' +
                                    '    </option><option value=null>--</option>' +
                                    '  </select>' +
                                    '</div>';
                        }
                    }
                }

                template = question.type === 'boolean' ? template.replace("classToken@", "checkbox") : template.replace("classToken@", "form-control");
                template = question.required ? template.replace("requiredToken@", "required ") : template.replace("requiredToken@", "");

                if (question.repeats) {
                    var repeatDirective = '<fs-questionnaire-repeating-question model-id="' + linkId + '" data-ng-model="ngModel" value-sets="valueSets" />';
                    template = template.replace('@repeatToken', repeatDirective);
                } else {
                    template = template.replace('@repeatToken', '');
                }

                if (iAttrs.totalQuestions > 1) {
                    template = '<label class="control-label" for="' + question.linkId + '">' + $filter('questionnaireLabel')(linkId) + '</label>&nbsp;&nbsp;' +
                        template;
                }
                template = '<div class="form-group-lg" >' + template;

                $compile(template)(scope, function(cloned) {
                    iElem.append(cloned);
                });

                function updateModel() {
                    scope.$apply(function() {
                        var element = document.getElementById(linkId);
                        var val = element.value;
                        setModel(ngModelGet, linkId.replace('[x]', ''), scope.repeats, val);
                    });
                }

                iElem.bind('change', updateModel);
                function setModel(obj, path, repeats, value) {
                    if (repeats) {
                        return obj;
                    }
                    if (typeof path === "string") {
                        path = path.split('.');
                    }
                    if (path.length > 1) {
                        var p = path.shift();
                        if (obj[p] === null || !angular.isObject(obj[p])) {
                            obj[p] = {};
                        }
                        setModel(obj[p], path, repeats, value);
                    } else if (repeats) {
                        obj[path[0]] = [];
                    } else {
                        obj[path[0]] = value;
                    }
                    return obj;
                }

                // removes trailing "value"
                function setLinkId(path, repeats) {
                    if (repeats) {
                        return path;
                    }
                    if (typeof path === "string") {
                        path = path.split('.');
                        if (path[path.length - 1] === 'value') {
                            path.pop();
                        }
                    }
                    return path.join('.');
                }
            }
        }
    ]);

    app.directive('fsQuestionnaireRepeatingGroup', ['$compile', '$filter', '$parse',
        function($compile, $filter, $parse) {
            // Description: Manage repeating group of items.
            // Usage: <fs-questionnaire-repeating-group group-id="groupId" group-members="groupId" ng-model="vm.answers" />
            var directiveDefinitionObject = {
                restrict: 'E',
                link: link,
                scope: {
                    ngModel: '='
                }
            };
            return directiveDefinitionObject;

            function link(scope, iElem, iAttrs) {
                var groupId = iAttrs.groupId;
                var members = iAttrs.groupMembers.split('..');
                var localArray = [];
                var ngModelGet = $parse(iAttrs.ngModel)(scope);

                var template = '<div class="btn-group col-md-10">' +
                    '  <button type="submit"' +
                    '          class="btn btn-info"' +
                    '          data-ng-click="addToList()">' +
                    '          <i class="fa fa-plus"></i>&nbsp;Save to List' +
                    '  </button>' +
                    '  <button type="button" class="btn btn-info pull-right" data-ng-click="reset()">' +
                    '      <i class="fa fa-refresh"></i>&nbsp;Reset' +
                    '  </button>' +
                    '</div>';

                var listDirective = '<fs-questionnaire-group-list items="ngModel.' + groupId + '" group-id="' + groupId + '" />';

                template = template + listDirective;

                scope.addToList = function() {
                    var arrayItem = {};
                    _.forEach(members, function(item) {
                        var element = document.getElementById(item);
                        var val = element.value;
                        var path = item.replace(groupId + '.', '');
                        setArrayItem(arrayItem, path, val);
                        element.value = '';
                    });
                    localArray.push(arrayItem);
                    setModel(ngModelGet, groupId, localArray);
                };

                scope.reset = function() {
                    _.forEach(members, function(item) {
                        var element = document.getElementById(item);
                        element.value = '';
                    });
                };

                $compile(template)(scope, function(cloned) {
                    iElem.replaceWith(cloned);
                });

                function setArrayItem(obj, path, value) {
                    if (typeof path === "string") {
                        path = path.split('.');
                    }
                    if (path.length > 1) {
                        var p = path.shift();
                        if (obj[p] === null || !angular.isObject(obj[p])) {
                            obj[p] = {};
                        }
                        setArrayItem(obj[p], path, value);
                    } else {
                        obj[path[0]] = value;
                    }
                    return obj;
                }

                function setModel(obj, path, value) {
                    if (typeof path === "string") {
                        path = path.split('.');
                    }
                    if (path.length > 1) {
                        var p = path.shift();
                        if (obj[p] === null || !angular.isObject(obj[p])) {
                            obj[p] = {};
                        }
                        setModel(obj[p], path, value);
                    } else {
                        obj[path[0]] = value;
                    }
                    return obj;
                }
            }
        }
    ]);

    app.directive('fsQuestionnaireRepeatingQuestion', ['$compile',
        function($compile) {
            // Description: Manage repeating group of items.
            // Usage: <fs-questionnaire-repeating-question model-id="modelId" ng-model="vm.answers" />
            var directiveDefinitionObject = {
                restrict: 'E',
                link: link,
                scope: {
                    ngModel: '='
                }
            };
            return directiveDefinitionObject;

            function link(scope, iElem, iAttrs) {
                var modelLinkId = iAttrs.modelId;
                var template = '<span>' +
                    '  <a href="" ' +
                    '     data-ng-click="addToList()"' +
                    '     class="fa fa-plus-square-o">' +
                    '  </a>' +
                    '</span>';

                scope.addToList = function() {
                    console.log('addToList::');
                    console.log(iAttrs);
                    console.log(scope);
                };

                $compile(template)(scope, function(cloned) {
                    iElem.replaceWith(cloned);
                });
            }
        }
    ]);

})();