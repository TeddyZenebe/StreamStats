//------------------------------------------------------------------------------
//----- nssService -----------------------------------------------------
//------------------------------------------------------------------------------
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
//-------1---------2---------3---------4---------5---------6---------7---------8
//       01234567890123456789012345678901234567890123456789012345678901234567890
//-------+---------+---------+---------+---------+---------+---------+---------+
// copyright:   2015 WiM - USGS
//    authors:  Jeremy K. Newson USGS Wisconsin Internet Mapping
//             
// 
//   purpose:  The service agent is responsible for initiating service calls, 
//             capturing the data that's returned and forwarding the data back to 
//             the Controller.
//          
//discussion:
//
//https://docs.angularjs.org/api/ng/service/$http
//Comments
//06.16.2015 mjs - Created
//Import
var StreamStats;
(function (StreamStats) {
    var Services;
    (function (Services) {
        'use strict';
        var StatisticsGroup = /** @class */ (function () {
            function StatisticsGroup() {
            }
            return StatisticsGroup;
        }()); //end class
        Services.StatisticsGroup = StatisticsGroup;
        var nssService = /** @class */ (function (_super) {
            __extends(nssService, _super);
            //Constructor
            //-+-+-+-+-+-+-+-+-+-+-+-
            function nssService($http, $q, toaster, modal) {
                var _this = _super.call(this, $http, configuration.baseurls['NSS']) || this;
                _this.$q = $q;
                _this.toaster = toaster;
                _this.modalService = modal;
                _this._onSelectedStatisticsGroupChanged = new WiM.Event.Delegate();
                _this.clearNSSdata();
                return _this;
            }
            Object.defineProperty(nssService.prototype, "onSelectedStatisticsGroupChanged", {
                get: function () {
                    return this._onSelectedStatisticsGroupChanged;
                },
                enumerable: true,
                configurable: true
            });
            //Methods
            //-+-+-+-+-+-+-+-+-+-+-+-
            nssService.prototype.clearNSSdata = function () {
                //console.log('in clear nss data');
                this.loadingParametersByStatisticsGroupCounter = 0;
                this.estimateFlowsCounter = 0;
                this.selectedStatisticsGroupList = [];
                this.statisticsGroupList = [];
                this.canUpdate = true;
                this.queriedRegions = false;
                this.isDone = false;
                this.reportGenerated = false;
            };
            nssService.prototype.loadStatisticsGroupTypes = function (rcode, regressionregions) {
                var _this = this;
                this.toaster.pop('wait', "Loading Available Scenarios", "Please wait...", 0);
                //console.log('in load StatisticsGroups', rcode, regressionregions);
                if (!rcode && !regressionregions)
                    return;
                var url = configuration.baseurls['NSS'] + configuration.queryparams['statisticsGroupLookup'].format(rcode, regressionregions);
                var request = new WiM.Services.Helpers.RequestInfo(url, true);
                this.loadingStatisticsGroup = true;
                this.statisticsGroupList = [];
                this.Execute(request).then(function (response) {
                    //console.log(response.data);
                    //tests
                    //response.data.length = 0;
                    if (response.data.length > 0) {
                        _this.loadingStatisticsGroup = false;
                        angular.forEach(response.data, function (value, key) {
                            _this.statisticsGroupList.push(value);
                        });
                    }
                    _this.toaster.clear();
                }, function (error) {
                    //sm when complete
                    _this.toaster.clear();
                    _this.toaster.pop('error', "There was an error Loading Available Scenarios", "Please retry", 0);
                }).finally(function () {
                    _this.loadingStatisticsGroup = false;
                });
            };
            nssService.prototype.checkArrayForObj = function (arr, obj) {
                for (var i = 0; i < arr.length; i++) {
                    if (angular.equals(arr[i], obj)) {
                        return i;
                    }
                }
                ;
                return -1;
            };
            nssService.prototype.loadParametersByStatisticsGroup = function (rcode, statisticsGroupID, regressionregions, percentWeights) {
                var _this = this;
                if (this.loadingParametersByStatisticsGroupCounter == 0) {
                    this.toaster.pop('wait', "Loading Parameters by Statistics Group", "Please wait...", 0);
                }
                this.loadingParametersByStatisticsGroupCounter++;
                //console.log('in load StatisticsGroup parameters', rcode, statisticsGroupID,regressionregions);
                if (!rcode && !statisticsGroupID && !regressionregions)
                    return;
                var url = configuration.baseurls['NSS'] + configuration.queryparams['statisticsGroupParameterLookup'].format(rcode, statisticsGroupID, regressionregions);
                var request = new WiM.Services.Helpers.RequestInfo(url, true);
                this.Execute(request).then(function (response) {
                    //check to make sure there is a valid response
                    if (response.data[0].RegressionRegions[0].Parameters && response.data[0].RegressionRegions[0].Parameters.length > 0) {
                        //add Regression Regions to StatisticsGroupList and add percent weights
                        _this.selectedStatisticsGroupList.forEach(function (statGroup) {
                            if (response.data[0].StatisticGroupName == statGroup.Name) {
                                statGroup['StatisticGroupName'] = statGroup.Name;
                                statGroup['StatisticGroupID'] = statGroup.ID;
                                response.data[0].RegressionRegions.forEach(function (regressionRegion) {
                                    percentWeights.forEach(function (regressionRegionPercentWeight) {
                                        if (regressionRegionPercentWeight.code.indexOf(regressionRegion.Code.toUpperCase()) > -1) {
                                            regressionRegion["PercentWeight"] = regressionRegionPercentWeight.percentWeight;
                                        }
                                    });
                                });
                                statGroup.RegressionRegions = response.data[0].RegressionRegions;
                                _this._onSelectedStatisticsGroupChanged.raise(null, WiM.Event.EventArgs.Empty);
                            }
                        });
                    }
                    //this.toaster.clear();
                    //sm when complete
                }, function (error) {
                    //sm when error
                    _this.toaster.clear();
                    _this.toaster.pop('error', "There was an error Loading Parameters by Statistics Group", "Please retry", 0);
                }).finally(function () {
                    _this.loadingParametersByStatisticsGroupCounter--;
                    if (_this.loadingParametersByStatisticsGroupCounter == 0) {
                        _this.toaster.clear();
                    }
                });
            };
            nssService.prototype.estimateFlows = function (studyAreaParameterList, paramValueField, rcode, regressionregion, append) {
                var _this = this;
                if (append === void 0) { append = false; }
                if (!this.canUpdate && !append)
                    return;
                //loop over all selected StatisticsGroups
                this.selectedStatisticsGroupList.forEach(function (statGroup) {
                    _this.canUpdate = false;
                    if (_this.estimateFlowsCounter == 0) {
                        _this.toaster.pop('wait', "Estimating Flows", "Please wait...", 0);
                    }
                    _this.estimateFlowsCounter++;
                    _this.cleanRegressionRegions(statGroup.RegressionRegions);
                    //console.log('in estimate flows method for ', statGroup.Name, statGroup);
                    statGroup.RegressionRegions.forEach(function (regressionRegion) {
                        regressionRegion.Parameters.forEach(function (regressionParam) {
                            studyAreaParameterList.forEach(function (param) {
                                //console.log('search for matching params ', regressionParam.Code.toLowerCase(), param.code.toLowerCase());
                                if (regressionParam.Code.toLowerCase() == param.code.toLowerCase()) {
                                    //console.log('updating parameter in scenario object for: ', regressionParam.Code, ' from: ', regressionParam.Value, ' to: ', param.value);
                                    regressionParam.Value = param[paramValueField];
                                }
                            });
                        });
                    });
                    //Make a copy of the object and delete any existing results
                    var updatedScenarioObject = angular.fromJson(angular.toJson(statGroup));
                    updatedScenarioObject.RegressionRegions.forEach(function (regressionRegion) {
                        //delete results object if it exists
                        if (regressionRegion.Results)
                            delete regressionRegion.Results;
                    });
                    updatedScenarioObject = angular.toJson([updatedScenarioObject], null);
                    //do request
                    var url = configuration.baseurls['NSS'] + configuration.queryparams['estimateFlows'].format(rcode, statGroup.ID, regressionregion);
                    var request = new WiM.Services.Helpers.RequestInfo(url, true, 1, 'json', updatedScenarioObject);
                    statGroup.Citations = [];
                    _this.Execute(request).then(function (response) {
                        //console.log('estimate flows: ', response);
                        //nested requests for citations
                        var citationUrl = response.data[0].Links[0].Href;
                        if (!append)
                            _this.getSelectedCitations(citationUrl, statGroup);
                        //get header values
                        if (response.headers()['usgswim-messages']) {
                            var headerMsgs = response.headers()['usgswim-messages'].split(';');
                            statGroup.Disclaimers = {};
                            headerMsgs.forEach(function (item) {
                                var headerMsg = item.split(':');
                                if (headerMsg[0] == 'warning')
                                    statGroup.Disclaimers['Warnings'] = headerMsg[1].trim();
                                if (headerMsg[0] == 'error')
                                    statGroup.Disclaimers['Error'] = headerMsg[1].trim();
                                //comment out for not, not useful
                                //if (headerMsg[0] == 'info') statGroup.Disclaimers['Info'] = headerMsg[1].trim();
                            });
                            //console.log('headerMsgs: ', statGroup.Name, statGroup.Disclaimers);
                        }
                        //if (append) console.log('in estimate flows for regulated basins: ', response);
                        //make sure there are some results
                        if (response.data[0].RegressionRegions.length > 0 && response.data[0].RegressionRegions[0].Results && response.data[0].RegressionRegions[0].Results.length > 0) {
                            if (!append) {
                                statGroup.RegressionRegions = [];
                                statGroup.RegressionRegions = response.data[0].RegressionRegions;
                            }
                            else {
                                //loop over and append params
                                statGroup.RegressionRegions.forEach(function (rr) {
                                    //console.log('in estimate flows for regulated basins: ', rr);
                                    rr.Parameters.forEach(function (p) {
                                        var responseRegions = response.data[0].RegressionRegions;
                                        for (var i = 0; i < responseRegions.length; i++) {
                                            if (responseRegions[i].ID === rr.ID) {
                                                for (var j = 0; j < responseRegions[i].Parameters.length; j++) {
                                                    if (responseRegions[i].Parameters[j].Code == p.Code) {
                                                        p[paramValueField] = responseRegions[i].Parameters[j].Value;
                                                    }
                                                } //next j
                                            } //end if
                                        }
                                        ; //next i
                                    }); //end p
                                    rr.Results.forEach(function (r) {
                                        var responseRegions = response.data[0].RegressionRegions;
                                        for (var i = 0; i < responseRegions.length; i++) {
                                            if (responseRegions[i].ID === rr.ID) {
                                                for (var j = 0; j < responseRegions[i].Results.length; j++) {
                                                    if (responseRegions[i].Results[j].code == r.code) {
                                                        r[paramValueField] = responseRegions[i].Results[j].Value;
                                                    }
                                                } //next j
                                            } //end if
                                        }
                                        ; //next i
                                    }); //end r
                                }); //end rr
                                //loop over and append statistic
                            }
                            //overwrite existing Regressions Regions array with new one from request that includes results
                        }
                        else {
                            _this.toaster.clear();
                            _this.toaster.pop('error', "There was an error Estimating Flows for " + statGroup.Name, "No results were returned", 0);
                            //this.isDone = true;
                            //console.log("Zero length flow response, check equations in NSS service");
                        }
                        //sm when complete
                    }, function (error) {
                        //sm when error
                        _this.toaster.clear();
                        _this.toaster.pop('error', "There was an error Estimating Flows", "HTTP request error", 0);
                    }).finally(function () {
                        //if success and counter is zero, clear toast
                        _this.estimateFlowsCounter--;
                        if (_this.estimateFlowsCounter < 1) {
                            _this.toaster.clear();
                            _this.estimateFlowsCounter = 0;
                            _this.canUpdate = true;
                        } //end if                       
                    });
                });
            };
            nssService.prototype.getSelectedCitations = function (citationUrl, statGroup) {
                ////nested requests for citations
                //console.log('citations: ', citationUrl, statGroup, this.getSelectedCitationsCounter);
                var _this = this;
                var url = citationUrl;
                var request = new WiM.Services.Helpers.RequestInfo(url, true, 0, 'json');
                this.Execute(request).then(function (response) {
                    //console.log('get citations: ', response);
                    if (response.data[0] && response.data[0].ID) {
                        angular.forEach(response.data, function (value, key) {
                            statGroup.Citations.push(value);
                        });
                    }
                    //sm when complete
                }, function (error) {
                    //sm when error
                    _this.toaster.pop('error', "There was an error getting selected Citations for " + statGroup.Name, "No results were returned", 0);
                }).finally(function () {
                });
            };
            nssService.prototype.getflattenNSSTable = function (name) {
                var result = [];
                try {
                    this.selectedStatisticsGroupList.forEach(function (sgroup) {
                        sgroup.RegressionRegions.forEach(function (regRegion) {
                            regRegion.Results.forEach(function (regResult) {
                                result.push({
                                    Name: name,
                                    Region: regRegion.PercentWeight ? regRegion.PercentWeight.toFixed(0) + "% " + regRegion.Name : regRegion.Name,
                                    Statistic: regResult.Name,
                                    Code: regResult.code,
                                    Value: regResult.Value.toUSGSvalue(),
                                    Unit: regResult.Unit.Unit,
                                    Disclaimers: regRegion.Disclaimer ? regRegion.Disclaimer : undefined,
                                    Errors: (regResult.Errors && regResult.Errors.length > 0) ? regResult.Errors.map(function (err) { return err.Name + " : " + err.Value; }).join(', ') : undefined,
                                    MaxLimit: regResult.IntervalBounds && regResult.IntervalBounds.Upper > 0 ? regResult.IntervalBounds.Upper.toUSGSvalue() : undefined,
                                    MinLimit: regResult.IntervalBounds && regResult.IntervalBounds.Lower > 0 ? regResult.IntervalBounds.Lower.toUSGSvalue() : undefined,
                                    EquivYears: regResult.EquivalentYears ? regResult.EquivalentYears : undefined
                                });
                            }); //next regResult
                        }); //next regRegion
                    }); //next sgroup
                }
                catch (e) {
                    result.push({ Disclaimers: "Failed to output flowstats to table. " });
                }
                return result;
            };
            //HelperMethods
            //-+-+-+-+-+-+-+-+-+-+-+-
            nssService.prototype.cleanRegressionRegions = function (RegressionRegions) {
                for (var i = 0; i < RegressionRegions.length; i++) {
                    var regRegion = RegressionRegions[i];
                    if (regRegion.Name === 'Area-Averaged') {
                        RegressionRegions.splice(i, 1);
                        continue;
                    } //end if
                    //remove results
                    RegressionRegions.forEach(function (regressionRegion) {
                        //delete results object if it exists
                        if (regressionRegion.Results)
                            delete regressionRegion.Results;
                    });
                } //next i
            };
            return nssService;
        }(WiM.Services.HTTPServiceBase)); //end class
        factory.$inject = ['$http', '$q', 'toaster', 'StreamStats.Services.ModalService'];
        function factory($http, $q, toaster, modal) {
            return new nssService($http, $q, toaster, modal);
        }
        angular.module('StreamStats.Services')
            .factory('StreamStats.Services.nssService', factory);
    })(Services = StreamStats.Services || (StreamStats.Services = {}));
})(StreamStats || (StreamStats = {})); //end module  
//# sourceMappingURL=nssService.js.map