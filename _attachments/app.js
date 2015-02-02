// create our angular app and inject ngAnimate and ui-router 
// =============================================================================
angular.module('locationTrackingApp', ['ngAnimate', 'ngRoute'])


/* VALUES */

.value("map", {})
    .value("watchID", null)
    .value("remotedb", 'https://USERNAME:PASSWORD@USERNAME.cloudant.com/locationtracker')
    .value("num", 0)
    .value("successMessage", {})
    .value("errorMessage", "error")


/* ROUTES */

.config(['$routeProvider', function($routeProvider) {

    $routeProvider.
    when('/welcome', {
        templateUrl: 'location-welcome.html',
        controller: 'locationWelcomeController'
    }).
    when('/tracking', {
        templateUrl: 'location-tracking.html',
        controller: 'locationTrackingController'
    }).
    when('/savedata', {
        templateUrl: 'location-savedata.html',
        controller: 'locationTrackingSaveDataController'
    }).
    when('/success', {
        templateUrl: 'location-success.html',
        controller: 'locationTrackingSuccessController'
    }).
    when('/error', {
        templateUrl: 'location-error.html',
        controller: 'locationTrackingErrorController'
    }).
    when('/map', {
        templateUrl: 'tutorial2-map.html',
        controller: 'mapResultController'
    }).
    otherwise({
        redirectTo: '/welcome'
    })

}])


/* location-welcome.html Controller */

.controller('locationWelcomeController', function($scope) {
    $scope.transEnter = function() {}
    $scope.transLeave = function() {};
})


/* location-tracking.html Controller */

.controller('locationTrackingController', function($scope, map, watchID, pouchLocal, num) {

    var mapTracker;
    var lc;
    var last_lon = 0;
    var last_lat = 0;
    var session_id = guid();
    var db = pouchLocal;

    $scope.transEnter = function() {
        if (navigator.geolocation) {
            var osmUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
            var osmAttrib = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="http://mapbox.com">Mapbox</a>';
            var osm = new L.TileLayer(osmUrl, {
                attribution: osmAttrib,
                id: 'examples.map-i875mjb7'
            });

            mapTracker = new L.Map('map', {
                layers: [osm],
                zoom: 18,
                zoomControl: true
            });

            lc = L.control.locate({
                follow: true,
                strings: {
                    title: "Show me where I am, yo!"
                }
            }).addTo(mapTracker);

            mapTracker.locate({
                setView: true,
                maxZoom: 20
            });

            watchID = navigator.geolocation.watchPosition(doWatch, watchError);

            mapTracker.on('locationfound', onLocationFound);
            mapTracker.on('startfollowing', function() {
                mapTracker.on('dragstart', lc._stopFollowing, lc);
            }).on('stopfollowing', function() {
                mapTracker.off('dragstart', lc._stopFollowing, lc);
            });

        } else {
            alert("Geolocation IS NOT available!");
        }
    };

    $scope.transLeave = function() {
        mapTracker.remove();
    };

    function onLocationFound(e) {
        var radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(mapTracker);
        lc.start();
    }

    function doWatch(position) {
        var lon = Number(Math.round(position.coords.longitude + 'e' + 4) + 'e-' + 4);
        var lat = Number(Math.round(position.coords.latitude + 'e' + 4) + 'e-' + 4);
        // var lon = Number(position.coords.longitude);
        // var lat = Number(position.coords.latitude);
        if ((lon == last_lon) && (lat == last_lat)) return null;

        last_lon = lon;
        last_lat = lat;
        var coord = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "session_id": session_id,
                "timestamp": position.timestamp
            }
        };

        db.post(coord, function callback(err, response) {
            if (err) {
                alert('POST ERROR: ' + err);
            }

            db.get(response.id, function callback(err, doc) {
                if (err) {
                    console.log('ERROR: ' + err);
                }
                // console.log('GOT: ' + JSON.stringify(doc));
                $('.longitude-coordinate').text(doc.geometry.coordinates[0]);
                $('.latitude-coordinate').text(doc.geometry.coordinates[1]);
            });
        });
    }

    function watchError(err) {
        $('.longitude-coordinate, .latitude-coordinate').text("permission denied...");
        alert('Error' + err.code + ' msg: ' + err.message);
    }

    /**
     * Generates a GUID string.
     * @returns {String} The generated GUID.
     * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
     * @author Slavik Meltser (slavik@meltser.info).
     * @link http://slavik.meltser.info/?p=142
     */
    function guid() {
        function _p8(s) {
            var p = (Math.random().toString(16) + "000000000").substr(2, 8);
            return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    }
})

.controller('locationTrackingSaveDataController', function($scope, map, watchID, pouchLocal, remotedb, successMessage, errorMessage) {

    var timer;

    $scope.transEnter = function() {
        navigator.geolocation.clearWatch(watchID);
        db = pouchLocal;

        timer = setInterval(function() {
            $(".dot-anim")
                .velocity("transition.slideUpBigIn", {
                    drag: true
                })
                .delay(750)
                .velocity({
                    opacity: 0
                }, 750)
        }, 2000);

        db.replicate.to(remotedb).on('complete', function(info) {
            var timer = setTimeout(function() {
                successMessage.docs_written = info.docs_written;
                successMessage.start_time = info.start_time;
                window.location = "#/success";
            }, 2000)

        }).on('error', function(err) {
            console.log('error replicating: ' + err);

            errorMessage = 'error replicating: ' + err;
            window.location = "#/error";
        });
    };

    $scope.transLeave = function() {
        console.log("transLeave");
        clearInterval(timer);
    };
})


.controller('locationTrackingSuccessController', function($scope, successMessage) {
    $scope.docs_written = successMessage.docs_written;
    $scope.start_time = successMessage.start_time;

    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
})

.controller('locationTrackingErrorController', function($scope, errorMessage) {
    $scope.error_message = errorMessage;

    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
})


.controller('mapResultController', function($scope, pouchResult) {
        var mapResult = {};

        $scope.transEnter = function() {
            var db = pouchResult;

            db.changes({
                include_docs: true,
                live: true
            }).on('change', updateMovingLayer);

            mapResult = new L.Map('mapResult');
            resultMapInitialized = true;

            L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
                maxZoom: 20,
                attribution: 'Map data &copy; ' +
                    '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
                detectRetina: true,
                id: 'examples.map-20v6611k'
            }).addTo(mapResult);

            var movementLayer = L.geoJson(null, {
                pointToLayer: function(feature, latlng) {
                    markeroptions = {
                        icon: L.icon({
                            iconUrl: 'js/images/marker-icon.png',
                            iconRetinaUrl: 'js/images/marker-icon-2x.png',
                            iconSize: [25, 41],
                            iconAnchor: [10, 10],
                            shadowURL: 'js/images/marker-icon-shadow.png',
                            shadowRetinaURL: 'js/images/marker-icon-shadow-2x.png',
                            shadowSize: [41, 41],
                            shadowAnchor: [10, 10]
                        })
                    }
                    return L.marker(latlng, markeroptions);
                }
            }).addTo(mapResult);

            function updateMovingLayer(change) {
                if (!change.doc._deleted && change.doc.type == 'Feature') {
                    movementLayer.addData(change.doc);
                    mapResult.fitBounds(movementLayer.getBounds());
                }
            }
        };

        $scope.transLeave = function() {
            mapResult.remove();
        };

    })
    .factory('pouchLocal', [function() {
        var db = new PouchDB('localdb');
        return db;
    }])
    .factory('pouchResult', ["remotedb", function(remotedb) {
        var db = new PouchDB(remotedb);
        return db;
    }])


/* Directive used on controller items to allow for multiple trans in/out */

.directive('animationdirective', ['$animate', '$timeout',
    function($animate, $timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {

                $('.trans-button .btn').hover(
                    function() {
                        $(this).addClass('btnHover')
                    },
                    function() {
                        $(this).removeClass('btnHover')
                    }
                );

                $timeout(function() {
                    $animate.addClass(element, 'anim-page-transition-js');
                }, 10);
            }
        }
    }
])

.animation('.anim-page-transition-js',
    function() {
        return {

            enter: function(element, done) {
                var _element = $(element);
                _element.addClass("visible");
                $.each([".trans-step1", ".trans-step2", ".trans-step3", ".trans-step4"], function(index, value) {
                    _element.find(value)
                        .velocity({
                            opacity: 0,
                            translateY: "+200px"
                        }, {
                            duration: 0
                        })
                        .velocity({
                            opacity: 1,
                            translateY: "0"
                        }, {
                            easing: "easeInOutQuad",
                            duration: 1000 + (index * 200),
                            delay: 1000 + (index * 100),
                            queue: false,
                            complete: function(elements) {
                                console.log('enter complete', value);
                            }
                        });
                });

                _element
                    .velocity({
                        opacity: 0,
                        translateY: "100%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 500,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            console.log('enter complete');
                            angular.element(_element).scope().transEnter();
                        }
                    });

                _element.find(".trans-button")
                    .velocity({
                        opacity: 0,
                        translateY: "+100%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        easing: "easeInOutQuad",
                        delay: 1500,
                        queue: false,
                        complete: function(elements) {
                            console.log('enter trans-button complete');

                        }
                    });
            },
            leave: function(element, done) {
                var _element = $(element);
                angular.element(_element).scope().transLeave();
                _element.find(".trans-button")
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 0,
                        translateY: "+100%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 1500,
                        delay: 0,
                        complete: function(elements) {
                            console.log('leave trans-button complete');
                        }
                    });

                $.each([".trans-step1", ".trans-step2", ".trans-step3", ".trans-step4"], function(index, value) {
                    _element.find(value)
                        .velocity({
                            opacity: 1,
                            translateY: "0"
                        }, {
                            duration: 0
                        })
                        .velocity({
                            opacity: 0,
                            translateY: "-200px"
                        }, {
                            easing: "easeInOutQuad",
                            duration: 1000 + (index * 200),
                            delay: (index * 100),
                            queue: false,
                            complete: function(elements) {
                                console.log('leave complete', value);
                            }
                        });
                });

                _element
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 0,
                        translateY: "-100%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 1000,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            console.log('leave complete');
                            $(element).remove();
                        }
                    });
            }
        }
    }
);
