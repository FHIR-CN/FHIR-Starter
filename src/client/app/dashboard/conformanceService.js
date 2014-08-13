(function () {
    'use strict';

    var serviceId = 'conformanceService';

    angular.module('FHIRStarter').factory(serviceId, ['common', 'dataCache', 'fhirClient', conformanceService]);

    function conformanceService(common, dataCache, fhirClient) {
        var $q = common.$q;

        var service = {
            getConformance: getConformance,
            clearCache: clearCache
        };

        return service;

        function getConformance(baseUrl) {
            var deferred = $q.defer();

            var cachedData = dataCache.readFromCache('conformance');
            if (cachedData) {
                deferred.resolve(cachedData);
            } else {
                fhirClient.getResource(baseUrl + '/metadata')
                    .then(function (results) {
                        dataCache.addToCache('conformance', results.data);
                        deferred.resolve(results.data);
                    }, function (outcome) {
                        deferred.reject(outcome);
                    });
            }
            return deferred.promise;
        }

        function clearCache() {
            dataCache.addToCache('conformance', null);
        }
    }
})();