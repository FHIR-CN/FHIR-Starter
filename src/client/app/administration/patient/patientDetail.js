(function () {
    'use strict';

    var controllerId = 'patientDetail';

    angular.module('FHIRStarter').controller(controllerId,
        ['$location', '$routeParams', '$window', 'addressService', 'attachmentService', 'common', 'demographicsService', 'fhirServers', 'humanNameService', 'identifierService', 'localValueSets', 'organizationService', 'patientService', 'telecomService', patientDetail]);

    function patientDetail($location, $routeParams, $window, addressService, attachmentService, common, demographicsService, fhirServers, humanNameService, identifierService, localValueSets, organizationService, patientService, telecomService) {
        var vm = this;
        var logError = common.logger.getLogFn(controllerId, 'error');
        var logSuccess = common.logger.getLogFn(controllerId, 'success');
        var logWarning = common.logger.getLogFn(controllerId, 'warning');
        var $q = common.$q;

        vm.activeServer = null;
        vm.calculateAge = calculateAge;
        vm.cancel = cancel;
        vm.activate = activate;
        vm.delete = deletePatient;
        vm.edit = edit;
        vm.getOrganizationReference = getOrganizationReference;
        vm.getTitle = getTitle;
        vm.goBack = goBack;
        vm.isBusy = false;
        vm.isSaving = false;
        vm.isEditing = true;
        vm.loadingOrganizations = false;
        vm.patient = undefined;
        vm.save = save;
        vm.title = 'patientDetail';

        Object.defineProperty(vm, 'canSave', {
            get: canSave
        });

        Object.defineProperty(vm, 'canDelete', {
            get: canDelete
        });

        activate();

        function activate() {
            common.activateController([getActiveServer()], controllerId).then(function () {
                getRequestedPatient();
            });
        }

        function calculateAge(birthDate) {
            if (birthDate) {
                var ageDifMs = Date.now() - birthDate.getTime();
                var ageDate = new Date(ageDifMs); // miliseconds from epoch
                return Math.abs(ageDate.getUTCFullYear() - 1970);
            } else {
                return undefined;
            }
        }

        function cancel() {

        }

        function canDelete() {
            return !vm.isEditing;
        }

        function canSave() {
            return !vm.isSaving;
        }

        function deletePatient(patient) {
            if (patient && patient.resourceId && patient.hashKey) {
                patientService.deleteCachedPatient(patient.hashKey, patient.resourceId)
                    .then(function () {
                        logSuccess("Deleted patient " + patient.resourceId);
                        $location.path('/patients');
                    },
                    function (error) {
                        logError(error);
                    }
                );
            }
        }

        function edit(patient) {
            if (patient && patient.hashKey) {
                $location.path('/patient/' + patient.hashKey);
            }
        }

        function getActiveServer() {
            fhirServers.getActiveServer()
                .then(function (server) {
                    return vm.activeServer = server;
                });
        }

        function getOrganizationReference(input) {
            var deferred = $q.defer();
            vm.loadingOrganizations = true;
            organizationService.getOrganizationReference(vm.activeServer.baseUrl, input)
                .then(function (data) {
                    vm.loadingOrganizations = false;
                    deferred.resolve(data);
                }, function (error) {
                    vm.loadingOrganizations = false;
                    logError(error);
                    deferred.reject();
                });
            return deferred.promise;
        }

        function getRequestedPatient() {
            if ($routeParams.hashKey === 'new') {
                var data = patientService.initializeNewPatient();
                intitializeRelatedData(data);
                vm.title = 'Add New Patient';
                vm.isEditing = false;
            } else {
                if ($routeParams.hashKey) {
                    patientService.getCachedPatient($routeParams.hashKey)
                        .then(intitializeRelatedData, function (error) {
                            logError(error);
                        });
                } else if ($routeParams.id) {
                    var resourceId = vm.activeServer.baseUrl + '/Patient/' + $routeParams.id;
                    patientService.getPatient(resourceId)
                        .then(intitializeRelatedData, function (error) {
                            logError(error);
                        });
                }
            }

            function intitializeRelatedData(data) {
                vm.patient = data;
                humanNameService.init(vm.patient.name);
                demographicsService.init(vm.patient.gender, vm.patient.maritalStatus, vm.patient.communication);
                demographicsService.setBirthDate(vm.patient.birthDate);
                demographicsService.setBirthOrder(vm.patient.multipleBirthInteger);
                demographicsService.setMultipleBirth(vm.patient.multipleBirthBoolean);
                demographicsService.setDeceased(vm.patient.deceasedBoolean);
                demographicsService.setDeceasedDate(vm.patient.deceasedDateTime);
                attachmentService.init(vm.patient.photo, "Photos");
                identifierService.init(vm.patient.identifier);
                addressService.init(vm.patient.address, true);
                telecomService.init(vm.patient.telecom, true, true);
                vm.patient.fullName = humanNameService.getFullName();
                if (vm.patient.managingOrganization && vm.patient.managingOrganization.reference) {
                    var reference = vm.patient.managingOrganization.reference;
                    if (common.isAbsoluteUri(reference) === false) {
                        vm.patient.managingOrganization.reference = vm.activeServer.baseUrl + '/' + reference;
                    }
                    if (angular.isUndefined(vm.patient.managingOrganization.display)) {
                        vm.patient.managingOrganization.display = reference;
                    }
                }
                vm.title = getTitle();
            }
        }

        function getTitle() {
            var title = '';
            if (vm.patient) {
                title = 'Edit ' + (vm.patient.fullName || 'Unknown');
            } else {
                title = 'Add New Patient';
            }
            return title;

        }

        function goBack() {
            $window.history.back();
        }

        function save() {
            var patient = patientService.initializeNewPatient();
            if (humanNameService.getAll().length === 0) {
                logError("Patient must have at least one name entry.");
                return;
            }
            toggleSpinner(true);
            patient.name = humanNameService.mapFromViewModel();
            patient.photo = attachmentService.getAll();

            patient.birthDate = demographicsService.getBirthDate();
            patient.gender = demographicsService.getGender();
            patient.maritalStatus = demographicsService.getMaritalStatus();
            patient.multipleBirthBoolean = demographicsService.getMultipleBirth();
            patient.multipleBirthInteger =  demographicsService.getBirthOrder();
            patient.deceasedBoolean = demographicsService.getDeceased();
            patient.deceasedDateTime = demographicsService.getDeceasedDate();
            patient.communication = demographicsService.getLanguage();

            patient.address = addressService.mapFromViewModel();
            patient.telecom = telecomService.mapFromViewModel();
            patient.identifier = identifierService.getAll();

            patient.managingOrganization = vm.patient.managingOrganization;

            patient.active = vm.patient.active;
            if (vm.isEditing) {
                patientService.updatePatient(vm.patient.resourceId, patient)
                    .then(processResult,
                    function (error) {
                        logError("Update failed: " + error.outcome.details);
                        toggleSpinner(false);
                    });
            } else {
                patientService.addPatient(patient)
                    .then(processResult,
                    function (error) {
                        logError("Add failed: " + error.outcome.details);
                        toggleSpinner(false);
                    });
            }

            function processResult(results) {
                var resourceVersionId = results.headers.location || results.headers["content-location"];
                if (angular.isUndefined(resourceVersionId)) {
                    logWarning("Patient saved, but location is unavailable. CORS not implemented correctly at remote host.");
                } else {
                    logSuccess("Patient saved at " + resourceVersionId);
                }
                vm.patient.resourceVersionId = resourceVersionId;
                vm.patient.fullName = humanNameService.getFullName();
                vm.isEditing = true;
                vm.title = getTitle();
                toggleSpinner(false);
            }
        }

        function toggleSpinner(on) {
            vm.isBusy = on;
        }
    }
})();