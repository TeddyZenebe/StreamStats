//------------------------------------------------------------------------------
//----- MapController ----------------------------------------------------------
//------------------------------------------------------------------------------
//-------1---------2---------3---------4---------5---------6---------7---------8
//       01234567890123456789012345678901234567890123456789012345678901234567890
//-------+---------+---------+---------+---------+---------+---------+---------+
// copyright:   2015 WiM - USGS
//    authors:  Jeremy K. Newson USGS Wisconsin Internet Mapping
//   purpose:  
//discussion:   Controllers are typically built to reflect a View. 
//              and should only contailn business logic needed for a single view. For example, if a View 
//              contains a ListBox of objects, a Selected object, and a Save button, the Controller 
//              will have an ObservableCollection ObectList, 
//              Model SelectedObject, and SaveCommand.
//Comments
//04.15.2015 jkn - Created
//Imports"
var StreamStats;
(function (StreamStats) {
    var Controllers;
    (function (Controllers) {
        'use strict';
        var MapPoint = /** @class */ (function () {
            function MapPoint() {
                this.lat = 0;
                this.lng = 0;
            }
            return MapPoint;
        }());
        var Center = /** @class */ (function () {
            //Constructor
            //-+-+-+-+-+-+-+-+-+-+-+-
            function Center(lt, lg, zm) {
                this.lat = lt;
                this.lng = lg;
                this.zoom = zm;
            }
            return Center;
        }());
        var Layer = /** @class */ (function () {
            function Layer(nm, ul, ty, vis, op) {
                if (op === void 0) { op = undefined; }
                this.name = nm;
                this.url = ul;
                this.type = ty;
                this.visible = vis;
                this.layerOptions = op;
            }
            return Layer;
        }());
        var MapDefault = /** @class */ (function () {
            function MapDefault(mxZm, mnZm, zmCtrl) {
                if (mxZm === void 0) { mxZm = null; }
                if (mnZm === void 0) { mnZm = null; }
                if (zmCtrl === void 0) { zmCtrl = true; }
                this.maxZoom = mxZm;
                this.minZoom = mnZm;
                this.zoomControl = zmCtrl;
            }
            return MapDefault;
        }());
        var MapController = /** @class */ (function () {
            function MapController($scope, toaster, $analytics, $location, $stateParams, leafletBoundsHelper, leafletData, search, region, studyArea, StatisticsGroup, exploration, _prosperServices, eventManager, modal, modalStack) {
                var _this = this;
                this.$scope = $scope;
                this._prosperServices = _prosperServices;
                this.modal = modal;
                this.modalStack = modalStack;
                this.center = null;
                this.layers = null;
                this.mapDefaults = null;
                this.mapPoint = null;
                this.bounds = null;
                this.markers = null;
                this.paths = null;
                this.geojson = null;
                this.events = null;
                this.layercontrol = null;
                this.regionLayer = null;
                this._prosperIsActive = false;
                this.explorationToolsExpanded = false;
                $scope.vm = this;
                this.toaster = toaster;
                this.angulartics = $analytics;
                this.searchService = search;
                this.$locationService = $location;
                this.regionServices = region;
                this.leafletBoundsHelperService = leafletBoundsHelper;
                this.leafletData = leafletData;
                this.studyArea = studyArea;
                this.nssService = StatisticsGroup;
                this.explorationService = exploration;
                this.eventManager = eventManager;
                this.cursorStyle = 'pointer';
                this.environment = configuration.environment;
                this.selectedExplorationTool = null;
                this.init();
                //subscribe to Events
                this.eventManager.SubscribeToEvent(StreamStats.Services.onSelectedStudyAreaChanged, new WiM.Event.EventHandler(function () {
                    _this.onSelectedStudyAreaChanged();
                }));
                this.eventManager.SubscribeToEvent(WiM.Directives.onLayerChanged, new WiM.Event.EventHandler(function (sender, e) {
                    _this.onLayerChanged(sender, e);
                }));
                this.eventManager.SubscribeToEvent(WiM.Services.onSelectedAreaOfInterestChanged, new WiM.Event.EventHandler(function (sender, e) {
                    _this.onSelectedAreaOfInterestChanged(sender, e);
                }));
                this.eventManager.SubscribeToEvent(StreamStats.Services.onSelectedRegionChanged, new WiM.Event.EventHandler(function () {
                    _this.onSelectedRegionChanged();
                }));
                this.eventManager.SubscribeToEvent(StreamStats.Services.onEditClick, new WiM.Event.EventHandler(function (sender, e) {
                    _this.basinEditor();
                }));
                this.eventManager.SubscribeToEvent(StreamStats.Services.onStudyAreaReset, new WiM.Event.EventHandler(function () {
                    _this.removeGeoJson();
                }));
                this.eventManager.SubscribeToEvent(StreamStats.Services.onSelectedMethodExecuteComplete, new WiM.Event.EventHandler(function (sender, e) {
                    _this.onExplorationMethodComplete(sender, e);
                }));
                this.eventManager.SubscribeToEvent(StreamStats.Services.onSelectExplorationMethod, new WiM.Event.EventHandler(function (sender, e) {
                    if (sender.selectedMethod.navigationID != 0)
                        _this.onSelectExplorationMethod(sender, e);
                    if (sender.selectedMethod.navigationID == 0)
                        _this.selectedExplorationTool = null;
                }));
                $scope.$on('leafletDirectiveMap.mainMap.mousemove', function (event, args) {
                    var latlng = args.leafletEvent.latlng;
                    _this.mapPoint.lat = latlng.lat;
                    _this.mapPoint.lng = latlng.lng;
                    //change cursor after delienate button click
                    if (_this.studyArea.doDelineateFlag)
                        _this.cursorStyle = 'crosshair';
                });
                $scope.$on('leafletDirectiveMap.mainMap.drag', function (event, args) {
                    _this.cursorStyle = 'grabbing';
                });
                $scope.$on('leafletDirectiveMap.mainMap.dragend', function (event, args) {
                    _this.cursorStyle = 'pointer';
                });
                $scope.$on('leafletDirectiveMap.mainMap.click', function (event, args) {
                    //console.log('test',this.explorationService.drawElevationProfile)
                    //listen for click
                    if (_this._prosperServices.CanQuery) {
                        _this._prosperServices.GetPredictionValues(args.leafletEvent, _this.bounds);
                        return;
                    }
                    if (_this.studyArea.doDelineateFlag) {
                        _this.checkDelineatePoint(args.leafletEvent.latlng);
                        return;
                    }
                    //check if in edit mode
                    if (_this.studyArea.showEditToolbar)
                        return;
                    //check if in measurement mode
                    if (_this.explorationService.drawMeasurement)
                        return;
                    //check if in elevation profile mode
                    if (_this.explorationService.drawElevationProfile)
                        return;
                    //network navigation
                    if (exploration.selectedMethod != null && exploration.selectedMethod.locations.length <= exploration.selectedMethod.minLocations) {
                        console.log('in mapcontroller add point', exploration.selectedMethod.navigationPointCount, exploration.selectedMethod.locations.length);
                        //add point
                        if (exploration.explorationPointType == 'Start point location')
                            exploration.selectedMethod.addLocation('Start point location', new WiM.Models.Point(args.leafletEvent.latlng.lat, args.leafletEvent.latlng.lng, '4326'));
                        if (exploration.explorationPointType == 'End point location')
                            exploration.selectedMethod.addLocation('End point location', new WiM.Models.Point(args.leafletEvent.latlng.lat, args.leafletEvent.latlng.lng, '4326'));
                        //add temporary marker to map
                        for (var i = 0; i < exploration.selectedMethod.locations.length; i++) {
                            var item = exploration.selectedMethod.locations[i];
                            _this.markers['netnav_' + i] = {
                                lat: item.Latitude,
                                lng: item.Longitude,
                                message: exploration.selectedMethod.navigationName,
                                focus: true,
                                draggable: false
                            };
                        } //next i
                        _this.modal.openModal(StreamStats.Services.SSModalType.e_exploration);
                    }
                    //query streamgage is default map click action
                    else {
                        _this.queryPoints(args.leafletEvent);
                    }
                });
                $scope.$watch(function () { return _this.bounds; }, function (newval, oldval) { return _this.mapBoundsChange(oldval, newval); });
                $scope.$watch(function () { return _this.explorationService.elevationProfileGeoJSON; }, function (newval, oldval) {
                    if (newval)
                        _this.displayElevationProfile();
                });
                $scope.$watch(function () { return _this.explorationService.drawElevationProfile; }, function (newval, oldval) {
                    if (newval) {
                        _this.modal.openModal(StreamStats.Services.SSModalType.e_exploration);
                    }
                });
                $scope.$watch(function () { return _this.explorationService.selectElevationPoints; }, function (newval, oldval) {
                    if (newval)
                        _this.elevationProfile();
                });
                $scope.$watch(function () { return _this.explorationService.drawMeasurement; }, function (newval, oldval) {
                    //console.log('measurementListener ', newval, oldval);
                    if (newval)
                        _this.measurement();
                });
                $scope.$watch(function () { return _this.regionServices.regionMapLayerListLoaded; }, function (newval, oldval) {
                    if (newval) {
                        //console.log('in regionMapLayerListLoaded watch: ', this.regionServices.selectedRegion);
                        _this.addRegionOverlayLayers(_this.regionServices.selectedRegion.RegionID);
                    }
                });
                $scope.$watch(function () { return _this._prosperServices.DisplayedPrediction; }, function (newval, oldval) {
                    if (newval && _this.ProsperIsActive) {
                        _this.removeOverlayLayers("prosper", true);
                        _this.AddProsperLayer(newval.id);
                    }
                });
                //$scope.$watch(() => this.explorationService.selectedMethod, (newval, oldval) => {
                //    if (newval) {
                //        console.log('watch selectedMethod', newval);
                //        if (newval.navigationID == 0) this.resetExplorationTools();
                //    }
                //});
                $scope.$on('$locationChangeStart', function () { return _this.updateRegion(); });
                // check if region was explicitly set.
                if ($stateParams.rcode) {
                    this.regionServices.loadParametersByRegion();
                    this.setBoundsByRegion($stateParams.rcode);
                }
                if ($stateParams.rcode && $stateParams.workspaceID) {
                    this.regionServices.loadParametersByRegion();
                    this.studyArea.loadWatershed($stateParams.rcode, $stateParams.workspaceID);
                }
                //watch for result of regressionregion query
                $scope.$watch(function () { return _this.studyArea.regressionRegionQueryComplete; }, function (newval, oldval) {
                    //join codes from regression region object list and run query
                    if (newval && _this.studyArea.selectedStudyArea.RegressionRegions)
                        _this.nssService.loadStatisticsGroupTypes(_this.regionServices.selectedRegion.RegionID, _this.studyArea.selectedStudyArea.RegressionRegions.map(function (elem) {
                            return elem.code;
                        }).join(","));
                });
            }
            Object.defineProperty(MapController.prototype, "selectedExplorationMethodType", {
                get: function () {
                    if (this.explorationService.selectedMethod == null)
                        return 0;
                    return this.explorationService.selectedMethod.navigationID;
                },
                set: function (val) {
                    this.explorationService.setMethod(val, {});
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MapController.prototype, "ProsperIsActive", {
                get: function () {
                    return this._prosperIsActive;
                },
                enumerable: true,
                configurable: true
            });
            //Methods
            //-+-+-+-+-+-+-+-+-+-+-+-
            MapController.prototype.setExplorationMethodType = function (val) {
                //check if can select
                this.removeGeoJsonLayers("netnav_", true);
                //get this configuration
                this.explorationService.getNavigationConfiguration(val);
            };
            MapController.prototype.ExecuteNav = function () {
                //validate request
                if (this.explorationService.selectedMethod.locations.length != this.explorationService.selectedMethod.minLocations) {
                    this.toaster.pop("warning", "Warning", "You must select at least " + this.explorationService.selectedMethod.minLocations + " points.", 10000);
                    return;
                }
                var isOK = false;
                this.explorationService.explorationMethodBusy = true;
                this.explorationService.ExecuteSelectedModel();
            };
            MapController.prototype.ToggleProsper = function () {
                if (this._prosperIsActive) {
                    this._prosperIsActive = false;
                    this._prosperServices.CanQuery = false;
                    this.removeOverlayLayers("prosper", true);
                }
                else {
                    this._prosperIsActive = true;
                    //add prosper maplayers
                    this.AddProsperLayer(this._prosperServices.DisplayedPrediction.id);
                    this.ConfigureProsper();
                } //end if
            };
            MapController.prototype.ConfigureProsper = function () {
                this.modal.openModal(StreamStats.Services.SSModalType.e_prosper);
                //check if this bounds is outside of project bound, if so set proj extent
                //this.bounds = this.leafletBoundsHelperService.createBoundsFromArray(this._prosperServices.projectExtent);
            };
            //Helper Methods
            //-+-+-+-+-+-+-+-+-+-+-+-
            MapController.prototype.init = function () {
                this.setupMap();
                //console.log('in map init')
                this.explorationService.getNavigationEndPoints();
            };
            MapController.prototype.setupMap = function () {
                this.center = new Center(39, -100, 4);
                this.layers = {
                    baselayers: configuration.basemaps,
                    overlays: configuration.overlayedLayers
                };
                this.mapDefaults = new MapDefault(null, 3, true);
                this.markers = {};
                this.paths = {};
                this.geojson = {};
                this.regionLayer = {};
                //for elevation div
                var width = 600;
                if ($(window).width() < 768)
                    width = $(window).width() * 0.7;
                this.controls = {
                    scale: true,
                    draw: {
                        draw: {
                            polygon: false,
                            polyline: false,
                            rectangle: false,
                            circle: false,
                            circlemarker: false,
                            marker: false
                        }
                    },
                    custom: new Array(L.control.locate({ follow: false, locateOptions: { "maxZoom": 15 } }), L.control.elevation({ imperial: true, width: width }))
                };
                this.events = {
                    map: {
                        enable: ['mousemove']
                    }
                };
                this.mapPoint = new MapPoint();
                L.Icon.Default.imagePath = 'images';
            };
            MapController.prototype.scaleLookup = function (mapZoom) {
                switch (mapZoom) {
                    case 19: return '1,128';
                    case 18: return '2,256';
                    case 17: return '4,513';
                    case 16: return '9,027';
                    case 15: return '18,055';
                    case 14: return '36,111';
                    case 13: return '72,223';
                    case 12: return '144,447';
                    case 11: return '288,895';
                    case 10: return '577,790';
                    case 9: return '1,155,581';
                    case 8: return '2,311,162';
                    case 7: return '4,622,324';
                    case 6: return '9,244,649';
                    case 5: return '18,489,298';
                    case 4: return '36,978,596';
                    case 3: return '73,957,193';
                    case 2: return '147,914,387';
                    case 1: return '295,828,775';
                    case 0: return '591,657,550';
                }
            };
            MapController.prototype.queryPoints = function (evt) {
                var _this = this;
                //console.log('in query regional layers');
                this.toaster.pop("wait", "Information", "Querying Points...", 0);
                this.cursorStyle = 'wait';
                this.markers = {};
                this.leafletData.getMap("mainMap").then(function (map) {
                    _this.leafletData.getLayers("mainMap").then(function (maplayers) {
                        //check to make sure layer is visible
                        if (map.getZoom() <= 8) {
                            _this.cursorStyle = 'pointer';
                            _this.toaster.clear();
                            _this.toaster.pop("warning", "Warning", "You must be at Zoom Level 9 or greater to query points", 5000);
                            return;
                        }
                        _this.queryContent = { requestCount: 0, Content: $("<div>").attr("id", 'popupContent'), responseCount: 0 };
                        var _loop_1 = function (lyr) {
                            if (!maplayers.overlays.hasOwnProperty(lyr))
                                return "continue";
                            //skip these layers
                            if (["MaskLayer", "draw"].indexOf(lyr) > -1)
                                return "continue";
                            //visible Layers only
                            if (!map.hasLayer(maplayers.overlays[lyr]))
                                return "continue";
                            switch (_this.layers.overlays[lyr].type) {
                                case "agsFeature":
                                    //query
                                    maplayers.overlays[lyr].query().nearby(evt.latlng, 4).returnGeometry(false).run(function (error, results) { return _this.handleQueryResult(lyr, error, results, map, evt.latlng); });
                                    break;
                                default: //agsDynamic
                                    maplayers.overlays[lyr].identify().on(map).at(evt.latlng).returnGeometry(false).tolerance(5).run(function (error, results) { return _this.handleQueryResult(lyr, error, results, map, evt.latlng); });
                            }
                            _this.queryContent.requestCount++;
                        };
                        for (var lyr in maplayers.overlays) {
                            _loop_1(lyr);
                        } //next lyr
                    });
                });
            };
            MapController.prototype.handleQueryResult = function (lyr, error, results, map, latlng) {
                var _this = this;
                var querylayers = $("<div>").attr("id", lyr).appendTo(this.queryContent.Content);
                this.queryContent.requestCount--;
                results.features.forEach(function (queryResult) {
                    _this.layers.overlays[lyr].layerArray.forEach(function (item) {
                        if (item.layerId !== queryResult.layerId)
                            return;
                        if (["StreamGrid", "ExcludePolys", "Region", "Subregion", "Basin", "Subbasin", "Watershed", "Subwatershed"].indexOf(item.layerName) > -1)
                            return;
                        querylayers.append('<h5>' + item.layerName + '</h5>');
                        _this.queryContent.responseCount++;
                        //report ga event
                        _this.angulartics.eventTrack('explorationTools', { category: 'Map', label: 'queryPoints' });
                        //show only specified fields (if applicable)
                        if (_this.layers.overlays[lyr].hasOwnProperty("queryProperties") && _this.layers.overlays[lyr].queryProperties.hasOwnProperty(item.layerName)) {
                            var queryProperties_1 = _this.layers.overlays[lyr].queryProperties[item.layerName];
                            Object.keys(queryProperties_1).map(function (k) {
                                if (item.layerName == "Streamgages" && k == "FeatureURL") {
                                    var siteNo = queryResult.properties[k].split('site_no=')[1];
                                    var SSgagepage = 'https://streamstatsags.cr.usgs.gov/gagepages/html/' + siteNo + '.htm';
                                    querylayers.append('<strong>NWIS page: </strong><a href="' + queryResult.properties[k] + ' "target="_blank">link</a></br><strong>StreamStats Gage page: </strong><a href="' + SSgagepage + '" target="_blank">link</a></br>');
                                    _this.angulartics.eventTrack('explorationTools', { category: 'Map', label: 'streamgageQuery' });
                                }
                                else {
                                    querylayers.append('<strong>' + queryProperties_1[k] + ': </strong>' + queryResult.properties[k] + '</br>');
                                }
                            });
                        }
                        else { //show all fields
                            angular.forEach(queryResult.properties, function (value, key) {
                                querylayers.append('<strong>' + key + ': </strong>' + value + '</br>');
                            });
                        }
                    });
                });
                if (this.queryContent.requestCount < 1) {
                    this.toaster.clear();
                    this.cursorStyle = 'pointer';
                    if (this.queryContent.responseCount > 0) {
                        map.openPopup(this.queryContent.Content.html(), [latlng.lat, latlng.lng], { maxHeight: 200 });
                    }
                    else {
                        this.toaster.pop("warning", "Information", "No points were found at this location", 5000);
                    }
                }
            };
            MapController.prototype.elevationProfile = function () {
                var _this = this;
                document.getElementById('measurement-div').innerHTML = '';
                this.explorationService.measurementData = '';
                this.explorationService.showElevationChart = true;
                var el;
                //get reference to elevation control
                this.controls.custom.forEach(function (control) {
                    if (control._container.className.indexOf("elevation") > -1)
                        el = control;
                });
                //report ga event
                this.angulartics.eventTrack('explorationTools', { category: 'Map', label: 'elevationProfile' });
                this.leafletData.getMap("mainMap").then(function (map) {
                    _this.leafletData.getLayers("mainMap").then(function (maplayers) {
                        //create draw control
                        var drawnItems = maplayers.overlays.draw;
                        drawnItems.clearLayers();
                        _this.drawController({ metric: false }, true);
                        delete _this.geojson['elevationProfileLine3D'];
                        map.on('draw:drawstart', function (e) {
                            //console.log('in draw start');
                            el.clear();
                        });
                        //listen for end of draw
                        map.on('draw:created', function (e) {
                            map.removeEventListener('draw:created');
                            var feature = e.layer.toGeoJSON();
                            //convert to esriJSON
                            var esriJSON = '{"geometryType":"esriGeometryPolyline","spatialReference":{"wkid":"4326"},"fields": [],"features":[{"geometry": {"type":"polyline", "paths":[' + JSON.stringify(feature.geometry.coordinates) + ']}}]}';
                            //make the request
                            _this.toaster.pop("wait", "Information", "Querying the elevation service...", 0);
                            _this.explorationService.elevationProfile(esriJSON);
                            //disable button 
                            _this.explorationService.drawElevationProfile = false;
                            //force map refresh
                            map.panBy([0, 1]);
                        });
                    });
                });
            };
            MapController.prototype.drawController = function (options, enable) {
                //console.log('in drawcontroller: ', options, enable);
                var _this = this;
                if (!enable) {
                    this.drawControl.disable();
                    this.drawControl = undefined;
                    //console.log('removing drawControl', this.drawControl);
                    return;
                }
                this.leafletData.getMap("mainMap").then(function (map) {
                    //console.log('enable drawControl');
                    _this.drawControl = new L.Draw.Polyline(map, options);
                    _this.drawControl.enable();
                });
            };
            MapController.prototype.displayElevationProfile = function () {
                var _this = this;
                //get reference to elevation control
                var el;
                this.controls.custom.forEach(function (control) {
                    if (control._container && control._container.className.indexOf("elevation") > -1)
                        el = control;
                });
                //parse it
                this.geojson["elevationProfileLine3D"] = {
                    data: this.explorationService.elevationProfileGeoJSON,
                    style: {
                        "color": "#ff7800",
                        "weight": 5,
                        "opacity": 0.65
                    },
                    onEachFeature: el.addData.bind(el)
                };
                this.leafletData.getMap("mainMap").then(function (map) {
                    var container = el.onAdd(map);
                    _this.explorationService.elevationProfileHTML = container.innerHTML;
                    _this.modal.openModal(StreamStats.Services.SSModalType.e_exploration);
                    //delete line
                    delete _this.geojson['elevationProfileLine3D'];
                });
                this.toaster.clear();
                this.cursorStyle = 'pointer';
                this.selectedExplorationTool = null;
            };
            MapController.prototype.showLocation = function () {
                var _this = this;
                this.angulartics.eventTrack('explorationTools', { category: 'Map', label: 'showLocation' });
                //get reference to location control
                var lc;
                this.controls.custom.forEach(function (control) {
                    if (control._container.className.indexOf("leaflet-control-locate") > -1)
                        lc = control;
                });
                lc.start();
                this.leafletData.getMap("mainMap").then(function (map) {
                    map.on('locationfound', function () { _this.selectedExplorationTool = null; });
                });
            };
            MapController.prototype.resetExplorationTools = function () {
                var _this = this;
                document.getElementById('measurement-div').innerHTML = '';
                this.explorationService.elevationProfileHTML = '';
                if (this.drawControl)
                    this.drawController({}, false);
                this.explorationService.measurementData = '';
                this.explorationService.drawElevationProfile = false;
                this.explorationService.drawMeasurement = false;
                this.explorationService.selectElevationPoints = false;
                delete this.geojson['elevationProfileLine3D'];
                this.leafletData.getMap("mainMap").then(function (map) {
                    _this.leafletData.getLayers("mainMap").then(function (maplayers) {
                        var drawnItems = maplayers.overlays.draw;
                        drawnItems.clearLayers();
                        //remove listeners
                        if (_this.measurestart)
                            map.off("click", _this.measurestart);
                        if (_this.measuremove)
                            map.off("mousemove", _this.measuremove);
                        if (_this.measurestop)
                            map.off("draw:created", _this.measurestop);
                    });
                });
                this.explorationService.networkNavResults = [];
                this.selectedExplorationMethodType = 0;
                this.removeMarkerLayers("netnav_", true);
                this.removeGeoJsonLayers("netnavpoints", true);
                this.removeGeoJsonLayers("netnavroute", true);
                this.selectedExplorationTool = null;
                this.explorationService.explorationPointType = null;
            };
            MapController.prototype.measurement = function () {
                var _this = this;
                //user affordance
                this.explorationService.measurementData = 'Click the map to begin\nDouble click to end the Drawing';
                //report ga event
                this.angulartics.eventTrack('explorationTools', { category: 'Map', label: 'measurement' });
                this.leafletData.getMap("mainMap").then(function (map) {
                    //console.log('got map: ', map);
                    _this.leafletData.getLayers("mainMap").then(function (maplayers) {
                        //console.log('got maplayers: ', maplayers);
                        var stopclick = false; //to prevent more than one click listener
                        _this.drawController({ shapeOptions: { color: 'blue' }, metric: false }, true);
                        var drawnItems = maplayers.overlays.draw;
                        drawnItems.clearLayers();
                        //listeners active during drawing
                        _this.measuremove = function () {
                            _this.explorationService.measurementData = "Total length: " + _this.drawControl._getMeasurementString();
                        };
                        _this.measurestart = function () {
                            if (stopclick == false) {
                                stopclick = true;
                                _this.explorationService.measurementData = "Total Length: ";
                                map.on("mousemove", _this.measuremove);
                            }
                            ;
                        };
                        _this.measurestop = function (e) {
                            var layer = e.layer;
                            drawnItems.addLayer(layer);
                            drawnItems.addTo(map);
                            // Calculating the distance of the polyline, internal funciton '_getMeasurementString' doesn't work on mobile
                            var tempLatLng = null;
                            var totalDistance = 0.00000;
                            $.each(e.layer._latlngs, function (i, latlng) {
                                if (tempLatLng == null) {
                                    tempLatLng = latlng;
                                    return;
                                }
                                totalDistance += tempLatLng.distanceTo(latlng);
                                tempLatLng = latlng;
                            });
                            //reset button
                            _this.explorationService.measurementData = "Total length: " + (totalDistance * 3.28084).toFixed(0) + " ft";
                            //remove listeners
                            map.off("click", _this.measurestart);
                            map.off("mousemove", _this.measuremove);
                            map.off("draw:created", _this.measurestop);
                            _this.drawControl.disable();
                            _this.explorationService.drawMeasurement = false;
                            _this.selectedExplorationTool = null;
                        };
                        map.on("click", _this.measurestart);
                        map.on("draw:created", _this.measurestop);
                    });
                });
            };
            MapController.prototype.checkDelineatePoint = function (latlng) {
                var _this = this;
                //make sure were still at level 15 or greater
                this.leafletData.getMap("mainMap").then(function (map) {
                    _this.leafletData.getLayers("mainMap").then(function (maplayers) {
                        if (map.getZoom() < 15) {
                            _this.toaster.pop("error", "Delineation not allowed at this zoom level", 'Please zoom in to level 15 or greater', 5000);
                        }
                        //good to go
                        else {
                            _this.toaster.clear();
                            _this.studyArea.checkingDelineatedPoint = true;
                            _this.toaster.pop("info", "Information", "Validating your clicked point...", true, 0);
                            _this.cursorStyle = 'wait';
                            _this.markers = {};
                            //put pourpoint on the map
                            _this.markers['pourpoint'] = {
                                lat: latlng.lat,
                                lng: latlng.lng,
                                message: 'Your clicked point</br></br><strong>Latitude: </strong>' + latlng.lat.toFixed(5) + '</br><strong>Longitude: </strong>' + latlng.lng.toFixed(5),
                                focus: true,
                                draggable: true
                            };
                            //turn off delineate flag
                            _this.studyArea.doDelineateFlag = false;
                            //build list of layers to query before delineate
                            var queryString = 'visible:';
                            _this.regionServices.regionMapLayerList.forEach(function (item) {
                                if (item[0] == 'ExcludePolys')
                                    queryString += item[1];
                            });
                            _this.angulartics.eventTrack('delineationClick', { category: 'Map', label: _this.regionServices.selectedRegion.Name });
                            //force map refresh
                            map.invalidateSize();
                            var selectedRegionLayerName = _this.regionServices.selectedRegion.RegionID + "_region";
                            //if there are no map layers to query, skip with warning
                            if (queryString === 'visible:') {
                                _this.toaster.clear();
                                _this.toaster.pop("warning", "Selected State/Region does not have exlusion areas defined", "Delineating with no exclude polygon layer...", true, 0);
                                _this.startDelineate(latlng, true);
                                _this.angulartics.eventTrack('validatePoint', { category: 'Map', label: 'not advised (no point query)' });
                                _this.cursorStyle = 'pointer';
                                return;
                            }
                            //do point validation query
                            maplayers.overlays[selectedRegionLayerName].identify().on(map).at(latlng).returnGeometry(false).layers(queryString).run(function (error, results) {
                                //console.log('exclusion area check: ', queryString, results); 
                                _this.toaster.clear();
                                //if there are no exclusion area hits
                                if (results.features.length == 0) {
                                    //ga event
                                    _this.angulartics.eventTrack('validatePoint', { category: 'Map', label: 'valid' });
                                    _this.toaster.pop("success", "Your clicked point is valid", "Delineating your basin now...", 5000);
                                    _this.studyArea.checkingDelineatedPoint = false;
                                    _this.startDelineate(latlng, false);
                                }
                                //otherwise parse exclude Codes
                                else {
                                    _this.studyArea.checkingDelineatedPoint = false;
                                    var excludeCode = results.features[0].properties.ExcludeCod;
                                    var popupMsg = results.features[0].properties.ExcludeRea;
                                    if (excludeCode == 1) {
                                        _this.toaster.pop("error", "Delineation and flow statistic computation not allowed here", popupMsg, 0);
                                        //ga event
                                        _this.angulartics.eventTrack('validatePoint', { category: 'Map', label: 'not allowed' });
                                    }
                                    else {
                                        _this.toaster.pop("warning", "Delineation and flow statistic computation possible but not advised", popupMsg, true, 0);
                                        _this.startDelineate(latlng, true, popupMsg);
                                        _this.angulartics.eventTrack('validatePoint', { category: 'Map', label: 'not advised' });
                                    }
                                }
                                _this.cursorStyle = 'pointer';
                            });
                        }
                    });
                });
            };
            MapController.prototype.basinEditor = function () {
                var _this = this;
                var basinCopyGeoJSON = angular.fromJson(angular.toJson(this.geojson['globalwatershed'].data));
                //attempt to remove single cell pinched polygon ends
                basinCopyGeoJSON.geometry.coordinates = basinCopyGeoJSON.geometry.coordinates.filter(function (item) {
                    return item.length > 5;
                });
                this.leafletData.getMap("mainMap").then(function (map) {
                    _this.leafletData.getLayers("mainMap").then(function (maplayers) {
                        //create draw control
                        var drawnItems = maplayers.overlays.draw;
                        drawnItems.clearLayers();
                        var drawControl = new L.Draw.Polygon(map, drawnItems);
                        drawControl.enable();
                        //listen for end of draw
                        map.on('draw:created', function (e) {
                            map.removeEventListener('draw:created');
                            var editLayer = e.layer;
                            drawnItems.addLayer(editLayer);
                            var sourcePolygon = basinCopyGeoJSON;
                            var clipPolygon = editLayer.toGeoJSON();
                            if (_this.studyArea.drawControlOption == 'add') {
                                _this.angulartics.eventTrack('basinEditor', { category: 'Map', label: 'addArea' });
                                //console.log('sourcePolygon:', sourcePolygon);
                                var editPolygon = turf.union(sourcePolygon, clipPolygon);
                                _this.studyArea.WatershedEditDecisionList.append.push(clipPolygon);
                                //this.studyArea.Disclaimers['isEdited'] = true;
                            }
                            if (_this.studyArea.drawControlOption == 'remove') {
                                _this.angulartics.eventTrack('basinEditor', { category: 'Map', label: 'removeArea' });
                                //console.log('remove layer', layer.toGeoJSON());
                                var editPolygon = turf.difference(sourcePolygon, clipPolygon);
                                //check for split polygon
                                //console.log('editPoly', editPolygon.length);
                                if (editPolygon.geometry.coordinates.length == 2) {
                                    alert('Splitting polygons is not permitted');
                                    drawnItems.clearLayers();
                                    return;
                                }
                                _this.studyArea.WatershedEditDecisionList.remove.push(clipPolygon);
                                //this.studyArea.Disclaimers['isEdited'] = true;
                            }
                            //set studyArea basin to new edited polygon
                            basinCopyGeoJSON.geometry.coordinates = editPolygon.geometry.coordinates;
                            //editPolygon.geometry.coordinates.forEach((item) => { basin.geometry.coordinates[0].push([item[1], item[0]]) });
                            //console.log('edited basin', basinCopyGeoJSON);
                            //show new polygon
                            _this.geojson['globalwatershed'].data = editPolygon;
                            drawnItems.clearLayers();
                            //console.log('editedAreas', angular.toJson(this.studyArea.WatershedEditDecisionList));
                        });
                    });
                });
            };
            MapController.prototype.canSelectExplorationTool = function (methodval) {
                switch (methodval) {
                    case StreamStats.Services.ExplorationMethodType.NETWORKPATH:
                        //if (this.regionServices.selectedRegion == null) {
                        //    this.toaster.pop("warning", "Warning", "you must first select a state or region to use this tool", 5000);
                        //    return false;
                        //}
                        //if (this.center.zoom < 10) {
                        //    this.toaster.pop("warning", "Warning", "you must be zoomed into at least a zoomlevel of 10 to use this tool", 5000);
                        //    return false;
                        //}
                        break;
                    case StreamStats.Services.ExplorationMethodType.FLOWPATH:
                        //if (this.regionServices.selectedRegion == null) {
                        //    this.toaster.pop("warning", "Warning", "you must first select a state or region to use this tool", 5000);
                        //    return false;
                        //}
                        //if (this.center.zoom < 10) {
                        //    this.toaster.pop("warning", "Warning", "you must be zoomed into at least a zoomlevel of 10 to use this tool", 5000);
                        //    return false;
                        //}
                        break;
                    case StreamStats.Services.ExplorationMethodType.NETWORKTRACE:
                        //if (this.regionServices.selectedRegion == null) {
                        //    this.toaster.pop("warning", "Warning", "you must first select a state or region to use this tool", 5000);
                        //    return false;
                        //}
                        //if (this.center.zoom < 10) {
                        //    this.toaster.pop("warning", "Warning", "you must be zoomed into at least a zoomlevel of 10 to use this tool", 5000);
                        //    return false;
                        //}
                        break;
                    default:
                        return false;
                } //end switch
                return true;
            };
            MapController.prototype.onExplorationMethodComplete = function (sender, e) {
                var _this = this;
                this.angulartics.eventTrack('explorationTools', { category: 'Map', label: 'networknav-' + this.explorationService.selectedMethod.navigationInfo.code });
                //console.log('in onexplorationmethodCOmplete:', this.explorationService.selectedMethod.navigationInfo.code)
                this.explorationService.explorationMethodBusy = false;
                if (e.features != null && e.features['features'].length > 0) {
                    //console.log('exploration method complete', e)
                    this.removeMarkerLayers("netnav_", true);
                    this.explorationService.networkNavResults.forEach(function (layer, key) {
                        _this.addGeoJSON(layer.name, layer.feature);
                        //zoomTo logic
                        if (layer.name == "netnavroute") {
                            _this.leafletData.getMap("mainMap").then(function (map) {
                                var tempExtent = L.geoJson(layer.feature);
                                map.fitBounds(tempExtent.getBounds());
                            });
                        }
                        _this.eventManager.RaiseEvent(WiM.Directives.onLayerAdded, _this, new WiM.Directives.LegendLayerAddedEventArgs(layer.name, "geojson", _this.geojson[layer.name].style));
                    });
                    //disable tool
                    this.selectedExplorationMethodType = 0;
                    this.selectedExplorationTool = null;
                    this.modalStack.dismissAll();
                } //end if
                if (e.report != null && e.report != '') {
                    this.modal.openModal(StreamStats.Services.SSModalType.e_navreport, { placeholder: e.report });
                } //end if
            };
            MapController.prototype.onSelectExplorationMethod = function (sender, e) {
                this.modal.openModal(StreamStats.Services.SSModalType.e_exploration);
            };
            MapController.prototype.onSelectedAreaOfInterestChanged = function (sender, e) {
                //ga event
                this.angulartics.eventTrack('Search', { category: 'Sidebar' });
                this.paths = {};
                var AOI = e.selectedAreaOfInterest;
                this.paths['AOI'] = {
                    type: "circleMarker",
                    radius: 15,
                    color: '#ff0000',
                    fillOpacity: 0.6,
                    stroke: false,
                    latlngs: {
                        lat: AOI.properties['Lat'],
                        lng: AOI.properties['Lon'],
                    }
                };
                this.leafletData.getMap("mainMap").then(function (map) {
                    map.fitBounds([
                        [AOI.properties['LatMin'], AOI.properties['LonMin']],
                        [AOI.properties['LatMax'], AOI.properties['LonMax']]
                    ]);
                    //force level 8
                    setTimeout(function () {
                        if (map.getZoom() < 8)
                            map.setZoom(8);
                    }, 500);
                    map.openPopup(// open popup at location listing all properties
                    $.map(Object.keys(AOI.properties), function (property) {
                        if (["Label", "ElevFt", "Lat", "Lon", "Source"].indexOf(property) != 0 - 1)
                            return "<b>" + property + ": </b>" + AOI.properties[property];
                    }).join("<br/>"), [AOI.properties['Lat'], AOI.properties['Lon']]);
                });
            };
            MapController.prototype.onSelectedRegionChanged = function () {
                //console.log('in onselected region changed', this.regionServices.regionList, this.regionServices.selectedRegion);
                if (!this.regionServices.selectedRegion)
                    return;
                this.removeOverlayLayers("_region", true);
                this.regionServices.loadMapLayersByRegion(this.regionServices.selectedRegion.RegionID);
            };
            MapController.prototype.onSelectedStudyAreaChanged = function () {
                var _this = this;
                var bbox;
                //console.log('in onselectedstudyareachange1', this.studyArea.selectedStudyArea.Features)
                if (!this.studyArea.selectedStudyArea || !this.studyArea.selectedStudyArea.FeatureCollection)
                    return;
                //clear out this.markers
                this.markers = {};
                this.removeOverlayLayers('globalwatershed', true);
                this.studyArea.selectedStudyArea.FeatureCollection['features'].forEach(function (layer) {
                    var item = angular.fromJson(angular.toJson(layer));
                    var name = item.id.toLowerCase();
                    _this.addGeoJSON(name, item);
                    _this.eventManager.RaiseEvent(WiM.Directives.onLayerAdded, _this, new WiM.Directives.LegendLayerAddedEventArgs(name, "geojson", _this.geojson[name].style));
                });
                //zoom to bounding box
                if (this.studyArea.selectedStudyArea.FeatureCollection['bbox']) {
                    bbox = this.studyArea.selectedStudyArea.FeatureCollection['bbox'];
                    this.leafletData.getMap("mainMap").then(function (map) {
                        map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], {});
                    });
                }
                //query basin against Karst
                if (this.regionServices.selectedRegion.Applications.indexOf("KarstCheck") > -1) {
                    this.studyArea.queryKarst(this.regionServices.selectedRegion.RegionID, this.regionServices.regionMapLayerList);
                }
                //query basin against regression regions
                if (!this.nssService.queriedRegions) {
                    //return if this state is not enabled
                    if (!this.regionServices.selectedRegion.ScenariosAvailable) {
                        this.studyArea.regressionRegionQueryComplete = true;
                        return;
                    }
                    this.nssService.queriedRegions = true;
                    //console.log('set queriedregions flag to true: ', this.nssService.queriedRegions);
                }
            };
            MapController.prototype.AddProsperLayer = function (id) {
                this.layers.overlays["prosper" + id] = new Layer("Prosper Layer", configuration.baseurls['ScienceBase'] + configuration.queryparams['ProsperPredictions'], "agsDynamic", true, {
                    "opacity": 1,
                    "layers": [id],
                    "format": "png8",
                    "f": "image"
                });
            };
            MapController.prototype.removeGeoJson = function (layerName) {
                if (layerName === void 0) { layerName = ""; }
                for (var k in this.geojson) {
                    if (typeof this.geojson[k] !== 'function') {
                        delete this.geojson[k];
                        this.eventManager.RaiseEvent(WiM.Directives.onLayerRemoved, this, new WiM.Directives.LegendLayerRemovedEventArgs(k, "geojson"));
                    }
                }
            };
            MapController.prototype.addGeoJSON = function (LayerName, feature) {
                if (LayerName == 'globalwatershed') {
                    var data = this.studyArea.simplify(feature);
                    this.geojson[LayerName] =
                        {
                            data: data,
                            style: {
                                //https://www.base64-image.de/
                                displayName: "Basin Boundary",
                                imagesrc: "data:image/png;base64,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",
                                fillColor: "yellow",
                                weight: 2,
                                opacity: 1,
                                color: 'white',
                                fillOpacity: 0.5
                            }
                        };
                }
                else if (LayerName == 'globalwatershedpoint') {
                    var lat = this.studyArea.selectedStudyArea.Pourpoint.Latitude;
                    var lng = this.studyArea.selectedStudyArea.Pourpoint.Longitude;
                    var rcode = this.studyArea.selectedStudyArea.RegionID;
                    var workspaceID = this.studyArea.selectedStudyArea.WorkspaceID;
                    this.geojson[LayerName] = {
                        data: feature,
                        onEachFeature: function (feature, layer) {
                            var popupContent = '<strong>Latitude: </strong>' + lat + '</br><strong>Longitude: </strong>' + lng + '</br><strong>Region: </strong>' + rcode + '</br><strong>WorkspaceID: </strong>' + workspaceID + '</br>';
                            angular.forEach(feature.properties, function (value, key) {
                                popupContent += '<strong>' + key + ': </strong>' + value + '</br>';
                            });
                            layer.bindPopup(popupContent);
                        },
                        style: {
                            displayName: "Basin Clicked Point",
                            imagesrc: "data:image/png;base64,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",
                            visible: true
                        }
                    };
                }
                else if (LayerName == 'regulatedWatershed') {
                    this.geojson[LayerName] =
                        {
                            data: feature,
                            style: {
                                //https://www.base64-image.de/
                                displayName: "Basin Boundary (Regulated Area)",
                                imagesrc: "data:image/png;base64,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",
                                fillColor: "red",
                                weight: 2,
                                opacity: 1,
                                color: 'white',
                                fillOpacity: 0.5
                            }
                        };
                }
                else if (LayerName.indexOf('netnavpoints') != -1) {
                    this.geojson[LayerName] = {
                        data: feature,
                        onEachFeature: function (feature, layer) {
                            var popupContent = '<strong>Network navigation start/end point</strong></br>';
                            angular.forEach(feature.properties, function (value, key) {
                                popupContent += '<strong>' + key + ': </strong>' + value + '</br>';
                            });
                            layer.bindPopup(popupContent);
                        },
                        pointToLayer: function (feature, latlng) {
                            //default class
                            var classname = "wmm-pin wmm-mutedblue wmm-icon-noicon wmm-icon-black wmm-size-25";
                            if (feature.properties.source == 'ss_gages')
                                classname = "wmm-pin wmm-blue wmm-icon-triangle wmm-icon-black wmm-size-25";
                            if (feature.properties.source == 'WQP')
                                classname = "wmm-pin wmm-sky wmm-icon-square wmm-icon-black wmm-size-25";
                            var myIcon = L.divIcon({
                                className: classname,
                            });
                            return L.marker(latlng, { icon: myIcon });
                        },
                        style: {
                            displayName: "Network navigation point",
                            imagesrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAlCAYAAAC+uuLPAAAACXBIWXMAAA7EAAAOxAGVKw4bAAA57GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxMzggNzkuMTU5ODI0LCAyMDE2LzA5LzE0LTAxOjA5OjAxICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgICAgICAgICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgICAgICAgICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ0MgMjAxNyAoV2luZG93cyk8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgICAgPHhtcDpDcmVhdGVEYXRlPjIwMTgtMDEtMzBUMTU6NTk6NDgtMDU6MDA8L3htcDpDcmVhdGVEYXRlPgogICAgICAgICA8eG1wOk1vZGlmeURhdGU+MjAxOC0wMS0zMVQxMTowMDoyMC0wNTowMDwveG1wOk1vZGlmeURhdGU+CiAgICAgICAgIDx4bXA6TWV0YWRhdGFEYXRlPjIwMTgtMDEtMzFUMTE6MDA6MjAtMDU6MDA8L3htcDpNZXRhZGF0YURhdGU+CiAgICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2UvcG5nPC9kYzpmb3JtYXQ+CiAgICAgICAgIDxwaG90b3Nob3A6Q29sb3JNb2RlPjM8L3Bob3Rvc2hvcDpDb2xvck1vZGU+CiAgICAgICAgIDx4bXBNTTpJbnN0YW5jZUlEPnhtcC5paWQ6M2FkNDgxMTctYjA3Mi05NjQ4LTk5MmYtZmIyZTgzNTcwOTkxPC94bXBNTTpJbnN0YW5jZUlEPgogICAgICAgICA8eG1wTU06RG9jdW1lbnRJRD5hZG9iZTpkb2NpZDpwaG90b3Nob3A6ZDZiMzhiZmUtMDY5Zi0xMWU4LTk2OTAtOGIzNWZmM2I1YzJjPC94bXBNTTpEb2N1bWVudElEPgogICAgICAgICA8eG1wTU06T3JpZ2luYWxEb2N1bWVudElEPnhtcC5kaWQ6NDQ0OTVjNjYtY2JjZS04ZDQyLWFhYmUtYjJmZTM4MjRmYWI3PC94bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+CiAgICAgICAgIDx4bXBNTTpIaXN0b3J5PgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+Y3JlYXRlZDwvc3RFdnQ6YWN0aW9uPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6aW5zdGFuY2VJRD54bXAuaWlkOjQ0NDk1YzY2LWNiY2UtOGQ0Mi1hYWJlLWIyZmUzODI0ZmFiNzwvc3RFdnQ6aW5zdGFuY2VJRD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OndoZW4+MjAxOC0wMS0zMFQxNTo1OTo0OC0wNTowMDwvc3RFdnQ6d2hlbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OnNvZnR3YXJlQWdlbnQ+QWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKFdpbmRvd3MpPC9zdEV2dDpzb2Z0d2FyZUFnZW50PgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+c2F2ZWQ8L3N0RXZ0OmFjdGlvbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0Omluc3RhbmNlSUQ+eG1wLmlpZDozYWQ0ODExNy1iMDcyLTk2NDgtOTkyZi1mYjJlODM1NzA5OTE8L3N0RXZ0Omluc3RhbmNlSUQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDp3aGVuPjIwMTgtMDEtMzFUMTE6MDA6MjAtMDU6MDA8L3N0RXZ0OndoZW4+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpzb2Z0d2FyZUFnZW50PkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE3IChXaW5kb3dzKTwvc3RFdnQ6c29mdHdhcmVBZ2VudD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OmNoYW5nZWQ+Lzwvc3RFdnQ6Y2hhbmdlZD4KICAgICAgICAgICAgICAgPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC94bXBNTTpIaXN0b3J5PgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpYUmVzb2x1dGlvbj45NjAwMDAvMTAwMDA8L3RpZmY6WFJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOllSZXNvbHV0aW9uPjk2MDAwMC8xMDAwMDwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT42NTUzNTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+Mjk8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+Mzc8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/Pj4hpkQAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAA2xJREFUeNrs181rI3Ucx/H3b2YyD8mkMZslSZOsaVfsXpaFlYLg3jwvgl4XRVGPXZ8FRawXQQVXlD3pQegee+tfIQiFZV1auw9tau3zQ9KkM5OZyfw81JV1aZNMCiq43/Mwr9985/f9zG+ElJJ/uhT+hfr/oFq/F07PzMj7tWU2t7dwHBdVU0nbaYbzea6++YaIg4peG+n7qSk5e+sX6o0GrucRBAGdKEIIgaqq6IkESctiuJDnufFxXrp8WZwI/fSLL+XthQUOHIdei9M0jbSd4pnz5/lwYkIMhL4/OSkX7i/S9n2EomAPDZErFknZaSzbJooimvU6rUaDxu4OTrMJgGWajF+4wCfvvStioR9Mfibn7t0lCEIM06JYrVKqjmBYJqqqoagqSEkYhnQ6Ic5+k5XFe2yurBBFEaZh8OzFi3z8ztuiL/Tza9/In2Zn8YOAoewpqmPnyBUK6IYB4ujFR1FE23VYW66xfOcOvueRtCyev3SJiSM22d9G5sb0tPz55k38ICBp25RGRsmXy+imeSwIoCgKVsqmVB2lNDKKoig4rsut+fnec3p7fh7X89ASCU4XhymcqaBqfU8VhmWRL5XJ5vMArK6v89X167IrenepBoCdyZCvVDAMM9bQCyEYymYpVs6gmyZBGLK6vtH9SVsHBwAk7TSZ3OmuLT221apKKpPBzmQAqO83uqNSSrREAjOZRFXVgWMukdAxTAsAx3F7Z6+iqmha4kTZqmoaCV0HIOiEvVEpJVEUnTDS5V8JpiB6o6Hv0/bcE5GBH+D/eQ/d0LujQgiklATtNr7nDYy2PZeDZutwElKp7uhw4XC+9vf22FpbHQj0220aOzs4rcMszj2R7Y6OnX0KANc5YGPlNxq7O/HeZBSxt7XJ+nKNqNNhKG3z9NnR7uhHb10VpWIRGUXUt3dYq9VitblZr7O6tITTOmxttVLh9StXRF9fmRdffU06rotumpRHRqmOnTvM3y61v7fL4twc2+trdMKQJ8tlfrj2dX9fmQf1wsuvyLbv9wU/CpYKBX787lsR+2A2c2NKGLqO73n8vrRIbeHXI1sdF+x5GuwFDwL2dTA7rtWe6wwE9o0+CmdO5QDY3dyIDcZCH4YVVUUAnU4nNhgbfRgGBgIHQh/AuWx2IHBg9PFf22P0P4H+MQCyncndp+2ZGQAAAABJRU5ErkJggg==",
                            visible: true
                        }
                    };
                }
                else if (LayerName == 'netnavroute') {
                    this.geojson[LayerName] =
                        {
                            data: feature,
                            visible: true,
                            style: {
                                displayName: "Network navigation route",
                                imagesrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAA2CAYAAACMRWrdAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAVaSURBVGhDzZr5VxpXFMf7n7ZpkqZLmqbRaIxaEzWyzIjghhtuQBQNuKMii0vSnqZb2qZNm66iwfavuL33jVbEOzBvmBn44XOOHD3P+TD3vXu/MG95MsdQL3h38rDgjsLu9fvw9O07hll6MAb9Sz9eWKuuxGaCSch8+IC9eD1Stx7B4OK3l9aqGzHf+q+w2jYM++82sQIcB+80QNSfAF/yt0vr1Y1Y1B+H7I12vOCGSwJ6rLX0w+CT78CbPrq0Xl2IBR9/CVt3vHgHGlkBjtyNNpiYzIGS+ptds+ZivZt/QOLhBOxdvccK6DGvzEEfli+3JlFzsdmhtdMDw3gJbjaqMBz7Ckswz65J1FSM9keyySdVgntXm2FqdBvUrb/YNc+omZiSOoTFnlnYvdbCCugR75qEwPJP7JrF1EwsFMrCzsfdcCBRgvT3I5HPRSPn1iymJmL+lZ9h7f4A7F+5ywpwHFxphPDAqjhsuDVLcVyMes68GoPce62sgB4r2LwH4t+Dh+lZHI6LjYafwfZtt9SBkX2/Hcan98S+5NbkcFSsN/k7LHeM4tjUzAroMYd32Lf+ml1TD0fFwgMrkP3gM7xY4wfGRlMfDC18w45N5XBMbCj2NSSxscqU4O71FpicSIOyXb5ncTgiRhcW756CvWtyY9OiKwz+1VfsmpVwRGxqLAXpm514scZLkA4YGo6N9CwO28UCyy9h/V5AqmfR384Mb+DYZKxncdgqRhs+5n0Mu5I9a6njNOpLHhjF2Co2PrMPqU96RNLlBDjSHz2EsdmnWILGexaHbWIU9VfarYv6stgmJqI+TgxWRX1ZbBELzmHUb5CL+rQPaeLXi/qyWC6mbv0JiU75qB/zRKFv7Rd2TTNYLkafDdIBIBX1GxQYnn9eNurLYqnYQPwFbDT3YXYy3rMo6k+Pbok7za1pFsvEzEb9RGfIUNSXxTKx0CRG/VtyUZ/GrNHIs6p7FoclYv61Vxj1B6WjfqR/WWQ0bs1qsURsrndBfDLLCeix2jYkFfVlqVqMPjXa+tT+qC9LVWJORn1ZqhIzF/V9pqK+LKbF6OJMRf3xHVBNRH1ZTInRPPeke9rRqC+LKTF613duduHFGi/B7duuqqJ+Ke5TPJk3oGQ1vIg7ewyuzJG8mIj6GC9MRX2DH09XgoRcaeINvi6AmjsReHMFcKFYdzYvJ2Y26tPJWW3UL0aICXixLlmxMYz626ai/gEoFo9NWimSGJVhAcuwIH4m4UcypejbeI1RP1izqM+jiXlwbwkpUZ7H0IO/MywWCSzhxCDXs9ZbAjC4aE3UL8WLJSfAn8/3nAbdSUNiwbnnIgzWMuqXoqCUKsSOUCYPPfjmCSk8ULzpQmUxLeqHah71S1FQSM0eoVge99WZGJYkSqnpfyqLTY9sSkd9embD6qhfiiaWPxfD19rdOoHe9L/lxfoTP2DU98tHfXwzrI76FzlCsTyoyLkY7S08HfFulRWjSLHgjkg/iaZF/ZfsmtahiSkZaiGHQoz6F/U0pZIYPc5DT5ZJ9SyK+mF7ov5FcG9hmStp/D+Im8qQxLCXKRkS09ljFPVXWynqy/Qse6P+RbB9oJjYw8iZGDVpJYtTCO4zVsxU1G+lqP/CsrGpIvh/NDGUotdiCCYxumtMHxuJfoFR3yPVsyjqT0zt2tazWETPopNQa8hi+vifksmDHg6hx1DpZOME9HAi6hejzYnnU8bZaEXl6Mbe5i4dgrUn0TrwYo0fGMm7veKLc7ujfjFnA7AGDb/aACxkUcyVKxITUR8vUqYEaRqh75ediPrFaGIF5ARfY1zBacOLzVmI4UHSkzuE/wDtg18mgH26LgAAAABJRU5ErkJggg==",
                                color: 'red'
                            }
                        };
                }
                //additional features get generic styling for now
                else {
                    this.geojson[LayerName] =
                        {
                            data: feature,
                            visible: true,
                            style: {
                                displayName: LayerName,
                                fillColor: "red",
                                color: 'red'
                            }
                        };
                }
            };
            MapController.prototype.onLayerChanged = function (sender, e) {
                var _this = this;
                if (e.PropertyName === "visible") {
                    if (!e.Value)
                        delete this.geojson[e.LayerName];
                    else {
                        //get feature
                        var value = null;
                        //need this in if now that we have network nav results 
                        if (this.studyArea.selectedStudyArea && this.studyArea.selectedStudyArea.FeatureCollection.features.length > 0) {
                            this.studyArea.selectedStudyArea.FeatureCollection['features'].forEach(function (layer) {
                                if (layer.id == e.LayerName) {
                                    var item = angular.fromJson(angular.toJson(layer));
                                    var name = item.id;
                                    _this.addGeoJSON(name, item);
                                }
                            });
                        }
                        if (this.explorationService.networkNavResults) {
                            for (var i = 0; i < this.explorationService.networkNavResults.length; i++) {
                                var item = angular.fromJson(angular.toJson(this.explorationService.networkNavResults[i]));
                                if (item.name == e.LayerName)
                                    this.addGeoJSON(e.LayerName, item.feature);
                            } //next
                        }
                    } //end if  
                } //end if
            };
            MapController.prototype.mapBoundsChange = function (oldValue, newValue) {
                this.nomnimalZoomLevel = this.scaleLookup(this.center.zoom);
                if (this.center.zoom >= 8 && oldValue !== newValue) {
                    //console.log('requesting region list');
                    this.regionServices.loadRegionListByExtent(this.bounds.northEast.lng, this.bounds.southWest.lng, this.bounds.southWest.lat, this.bounds.northEast.lat);
                    if (!this.regionServices.selectedRegion) {
                        this.toaster.pop("info", "Information", "User input is needed to continue", 5000);
                    }
                }
                if (this.center.zoom < 8 && oldValue !== newValue) {
                    //clear region list
                    this.regionServices.regionList = [];
                }
                if (this.center.zoom >= 15) {
                    this.studyArea.zoomLevel15 = true;
                }
                else {
                    this.studyArea.zoomLevel15 = false;
                }
            };
            MapController.prototype.updateRegion = function () {
                //get regionkey
                var key = (this.$locationService.search()).region;
                this.setBoundsByRegion(key);
            };
            MapController.prototype.setBoundsByRegion = function (key) {
                if (key && this.regionServices.loadRegionListByRegion(key)) {
                    //console.log('in setBoundsByRegion selectedRegion gets set here');
                    this.regionServices.selectedRegion = this.regionServices.regionList[0];
                    this.bounds = this.leafletBoundsHelperService.createBoundsFromArray(this.regionServices.selectedRegion.Bounds);
                    //this.center = <ICenter>{};
                }
            };
            MapController.prototype.addRegionOverlayLayers = function (regionId) {
                //console.log('in addRegionOverlayLayers');
                if (this.regionServices.regionMapLayerList.length < 1)
                    return;
                var layerList = [];
                var roots = this.regionServices.regionMapLayerList.map(function (layer) {
                    layerList.push(layer[1]);
                });
                this.layers.overlays[regionId + "_region"] = new Layer(regionId + " Map layers", configuration.baseurls['StreamStatsMapServices'] + configuration.queryparams['SSStateLayers'], "agsDynamic", true, {
                    "opacity": 1,
                    "layers": layerList,
                    "format": "png8",
                    "f": "image"
                });
                //get any other layers specified in config
                var layers = this.regionServices.selectedRegion.Layers;
                if (layers == undefined)
                    return;
                for (var layer in layers) {
                    this.layers.overlays[layer + "_region"] = layers[layer];
                }
            };
            MapController.prototype.removeOverlayLayers = function (name, isPartial) {
                var _this = this;
                if (isPartial === void 0) { isPartial = false; }
                var layeridList;
                layeridList = this.getLayerIdsByID(name, this.layers.overlays, isPartial);
                layeridList.forEach(function (item) {
                    //console.log('removing map overlay layer: ', item);
                    delete _this.layers.overlays[item];
                });
            };
            MapController.prototype.removeMarkerLayers = function (name, isPartial) {
                var _this = this;
                if (isPartial === void 0) { isPartial = false; }
                var layeridList;
                layeridList = this.getLayerIdsByID(name, this.markers, isPartial);
                layeridList.forEach(function (item) {
                    //console.log('removing map overlay layer: ', item);
                    delete _this.markers[item];
                });
            };
            MapController.prototype.removeGeoJsonLayers = function (name, isPartial) {
                var _this = this;
                if (isPartial === void 0) { isPartial = false; }
                var layeridList;
                layeridList = this.getLayerIdsByID(name, this.geojson, isPartial);
                layeridList.forEach(function (item) {
                    //console.log('removing map overlay layer: ', item);
                    delete _this.geojson[item];
                });
            };
            MapController.prototype.getLayerIdsByName = function (name, layerObj, isPartial) {
                var layeridList = [];
                for (var variable in layerObj) {
                    if (layerObj[variable].hasOwnProperty("name") && (isPartial ? (layerObj[variable].name.indexOf(name) > -1) : (layerObj[variable].name === name))) {
                        layeridList.push(variable);
                    }
                } //next variable
                return layeridList;
            };
            MapController.prototype.getLayerIdsByID = function (id, layerObj, isPartial) {
                var layeridList = [];
                for (var variable in layerObj) {
                    if (isPartial ? (variable.indexOf(id) > -1) : (variable === id)) {
                        layeridList.push(variable);
                    }
                } //next variable
                return layeridList;
            };
            MapController.prototype.startDelineate = function (latlng, isInExclusionArea, excludeReason) {
                //console.log('in startDelineate', latlng);
                var studyArea = new StreamStats.Models.StudyArea(this.regionServices.selectedRegion.RegionID, new WiM.Models.Point(latlng.lat, latlng.lng, '4326'));
                this.studyArea.AddStudyArea(studyArea);
                this.studyArea.loadStudyBoundary();
                //add disclaimer here
                if (isInExclusionArea)
                    this.studyArea.selectedStudyArea.Disclaimers['isInExclusionArea'] = 'The delineation point is in an exclusion area. ' + excludeReason;
            };
            //Constructor
            //-+-+-+-+-+-+-+-+-+-+-+-
            MapController.$inject = ['$scope', 'toaster', '$analytics', '$location', '$stateParams', 'leafletBoundsHelpers', 'leafletData', 'WiM.Services.SearchAPIService', 'StreamStats.Services.RegionService', 'StreamStats.Services.StudyAreaService', 'StreamStats.Services.nssService', 'StreamStats.Services.ExplorationService', 'StreamStats.Services.ProsperService', 'WiM.Event.EventManager', 'StreamStats.Services.ModalService', '$modalStack'];
            return MapController;
        }()); //end class
        angular.module('StreamStats.Controllers')
            .controller('StreamStats.Controllers.MapController', MapController);
    })(Controllers = StreamStats.Controllers || (StreamStats.Controllers = {}));
})(StreamStats || (StreamStats = {})); //end module
//# sourceMappingURL=MapController.js.map