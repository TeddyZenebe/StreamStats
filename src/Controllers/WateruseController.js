//------------------------------------------------------------------------------
//----- WaterUse ---------------------------------------------------------------
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
var StreamStats;
(function (StreamStats) {
    var Controllers;
    (function (Controllers) {
        'use strict';
        var WaterUseReportable = /** @class */ (function () {
            function WaterUseReportable() {
                this.Annual = { Graph: {}, Table: {} };
                this.Monthly = { Graph: { withdrawals: null, returns: null }, Table: {} };
            }
            return WaterUseReportable;
        }());
        var WateruseController = /** @class */ (function (_super) {
            __extends(WateruseController, _super);
            function WateruseController($scope, $http, studyAreaService, modal, $timeout) {
                var _this = _super.call(this, $http, configuration.baseurls.WaterUseServices) || this;
                _this.$timeout = $timeout;
                $scope.vm = _this;
                _this.modalInstance = modal;
                _this.StudyArea = studyAreaService.selectedStudyArea;
                _this.init();
                return _this;
            }
            Object.defineProperty(WateruseController.prototype, "StartYear", {
                get: function () {
                    return this._startYear;
                },
                set: function (val) {
                    if (!this.spanYear)
                        this.EndYear = val;
                    if (val <= this.EndYear && val >= this.YearRange.floor)
                        this._startYear = val;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WateruseController.prototype, "EndYear", {
                get: function () {
                    return this._endYear;
                },
                set: function (val) {
                    if (val >= this.StartYear && val <= this.YearRange.ceil)
                        this._endYear = val;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(WateruseController.prototype, "YearRange", {
                get: function () {
                    return this._yearRange;
                },
                enumerable: true,
                configurable: true
            });
            //Methods  
            //-+-+-+-+-+-+-+-+-+-+-+-
            WateruseController.prototype.GetWaterUse = function () {
                var _this = this;
                this.CanContiue = false;
                var headers = {
                    "Content-Type": "application/json"
                };
                var url = configuration.queryparams['Wateruse'].format(this.StartYear, this.EndYear, this.includePermits, this.computeReturns, this.computeDomesticWU);
                var studyAreaGeom = this.StudyArea.FeatureCollection.features.filter(function (f) { return (f.id).toLowerCase() == "globalwatershed"; })[0].geometry;
                var request = new WiM.Services.Helpers.RequestInfo(url, false, WiM.Services.Helpers.methodType.POST, "json", angular.toJson(studyAreaGeom));
                this.Execute(request).then(function (response) {
                    _this.showResults = true;
                    //sm when complete
                    _this.result = response.data;
                    if (_this.result.Messages === 'Wateruse not available at specified site.' || (!response.data.hasOwnProperty("withdrawal") && !response.data.hasOwnProperty("return")))
                        alert('Wateruse not available at specified site.');
                    _this.ReportData.Monthly.Graph = _this.loadGraphData(WaterUseType.Monthly);
                    _this.ReportData.Annual.Graph = _this.loadGraphData(WaterUseType.Annual);
                    _this.ReportData.Monthly.Table = _this.GetTableData(WaterUseType.Monthly);
                    _this.ReportData.Annual.Table = _this.GetTableData(WaterUseType.Annual);
                }, function (error) {
                    var x = error;
                    //sm when error                    
                }).finally(function () {
                    _this.CanContiue = true;
                });
            };
            WateruseController.prototype.Close = function () {
                this.modalInstance.dismiss('cancel');
            };
            WateruseController.prototype.Reset = function () {
                this.init();
            };
            WateruseController.prototype.Print = function () {
                window.print();
            };
            WateruseController.prototype.loadGraphData = function (useType) {
                try {
                    var results = { returns: [], withdrawals: [] };
                    switch (useType) {
                        case WaterUseType.Monthly:
                            //init table
                            var inittable = [];
                            var testx = new Array(12);
                            if (this.result.hasOwnProperty("withdrawal") && this.result.withdrawal.hasOwnProperty("monthly")) {
                                for (var month in this.result.withdrawal.monthly) {
                                    var montlyCodes = this.result.withdrawal.monthly[month]["code"];
                                    for (var code in montlyCodes) {
                                        //var itemindex = results.withdrawals.findIndex((elem) => { return elem == montlyCodes[code].name });
                                        //findIndex doesn't work for IE... so...
                                        var itemindex = -1;
                                        for (var i = 0; i < results.withdrawals.length; i++) {
                                            var elem = results.withdrawals[i];
                                            if (elem.key == montlyCodes[code].name) {
                                                itemindex = i;
                                                break;
                                            } //end if
                                        } //next i
                                        if (itemindex < 0) {
                                            var initArray = [];
                                            for (var i = 1; i <= 12; i++) {
                                                initArray.push({ "label": this.getMonth(i), "stack": "withdrawal", value: 0 });
                                            }
                                            itemindex = results.withdrawals.push({
                                                "key": montlyCodes[code].name,
                                                "values": initArray,
                                                "color": this.generateColorShade(190, 350)
                                            }) - 1;
                                        } //end if
                                        results.withdrawals[itemindex].values[+month - 1].value = montlyCodes[code].value;
                                    } //next code       
                                } //next month
                            } //end if
                            if (this.result.hasOwnProperty("return")) {
                                var values = [];
                                for (var month in this.result.return.monthly) {
                                    values.push({
                                        "label": this.getMonth(+month),
                                        "stack": "withdrawal",
                                        "value": this.Sum(this.result.return.monthly[month]["month"], "value")
                                    });
                                } //next month
                                results.returns.push({
                                    "key": "returns",
                                    "color": this.generateColorShade(0, 170),
                                    "values": values
                                });
                            } //end if                              
                            return results;
                        case WaterUseType.Annual:
                            if (this.result.hasOwnProperty("withdrawal") && this.result.withdrawal.hasOwnProperty("annual")) {
                                for (var annkey in this.result.withdrawal.annual) {
                                    var annItem = this.result.withdrawal.annual[annkey];
                                    results.withdrawals.push({
                                        name: annItem.name, value: annItem.value,
                                        color: this.generateColorShade(190, 350)
                                    });
                                } //next annItem
                            } //end if
                            if (this.result.hasOwnProperty("return") && this.result.withdrawal.hasOwnProperty("annual")) {
                                for (var annkey in this.result.return.annual) {
                                    var annItem = this.result.return.annual[annkey];
                                    results.returns.push({ name: annItem.name, value: annItem.value, color: this.generateColorShade(0, 170) });
                                } //next annItem
                            } //end if
                            return results;
                    } //end switch
                }
                catch (e) {
                    var x = e;
                }
            };
            WateruseController.prototype.GetTableData = function (useType) {
                var tableFields = [];
                var tableValues = [];
                try {
                    switch (useType) {
                        case WaterUseType.Monthly:
                            //init table
                            for (var i = 1; i <= 12; i++) {
                                tableValues.push({ "month": this.getMonth(i), "returns": { "name": "return", "SW": "---", "GW": "---" }, "withdrawals": { "SW": "---", "GW": "---", "code": [] } });
                            }
                            //returns
                            if (this.result.hasOwnProperty("return") && this.result.withdrawal.hasOwnProperty("monthly")) {
                                for (var item in this.result.return.monthly) {
                                    tableValues[+item - 1].returns.GW = this.result.return.monthly[item].month.hasOwnProperty("GW") ? this.result.return.monthly[item].month.GW.value.toFixed(3) : "---";
                                    tableValues[+item - 1].returns.SW = this.result.return.monthly[item].month.hasOwnProperty("SW") ? this.result.return.monthly[item].month.SW.value.toFixed(3) : "---";
                                } //next item
                            } //end if
                            //withdrawals
                            if (this.result.hasOwnProperty("withdrawal") && this.result.withdrawal.hasOwnProperty("monthly")) {
                                for (var mkey in this.result.withdrawal.monthly) {
                                    tableValues[+mkey - 1].withdrawals.GW = this.result.withdrawal.monthly[mkey].month.hasOwnProperty("GW") ? this.result.withdrawal.monthly[mkey].month.GW.value.toFixed(3) : "---";
                                    tableValues[+mkey - 1].withdrawals.SW = this.result.withdrawal.monthly[mkey].month.hasOwnProperty("SW") ? this.result.withdrawal.monthly[mkey].month.SW.value.toFixed(3) : "---";
                                    if (this.result.withdrawal.monthly[mkey].hasOwnProperty("code")) {
                                        var monthlycode = this.result.withdrawal.monthly[mkey].code;
                                        for (var cKey in monthlycode) {
                                            //var itemindex = tableFields.findIndex((elem) => { return elem == monthlycode[cKey].name });
                                            //findIndex doesn't work for IE... so...
                                            var itemindex = -1;
                                            for (var i = 0; i < tableFields.length; i++) {
                                                var elem = tableFields[i];
                                                if (elem == monthlycode[cKey].name) {
                                                    itemindex = i;
                                                    break;
                                                } //end if
                                            } //next i
                                            if (itemindex < 0) {
                                                itemindex = tableFields.push(monthlycode[cKey].name) - 1;
                                                tableValues.forEach(function (ele) { ele.withdrawals.code.push({ "name": monthlycode[cKey].name, "value": "---" }); });
                                            } //end if
                                            tableValues[+mkey - 1].withdrawals.code[itemindex].value = monthlycode[cKey].value.toFixed(3);
                                        }
                                    } //end if
                                } //next item
                            }
                            break;
                        case WaterUseType.Annual:
                            tableFields = ["", "Average Return", "Average Withdrawal"];
                            var sw = { name: "Surface Water", aveReturn: "---", aveWithdrawal: "---", unit: "MGD" };
                            var gw = { name: "Groundwater", aveReturn: "---", aveWithdrawal: "---", unit: "MGD" };
                            if (this.result.hasOwnProperty("withdrawal") && this.result.withdrawal.hasOwnProperty("annual")) {
                                var annWith = this.result.withdrawal.annual;
                                if (annWith.hasOwnProperty("SW"))
                                    sw.aveWithdrawal = annWith.SW.value.toFixed(3);
                                if (annWith.hasOwnProperty("GW"))
                                    gw.aveWithdrawal = annWith.GW.value.toFixed(3);
                            }
                            if (this.result.hasOwnProperty("return") && this.result.withdrawal.hasOwnProperty("annual")) {
                                var annreturn = this.result.return.annual;
                                if (annreturn.hasOwnProperty("SW"))
                                    sw.aveReturn = annreturn.SW.value.toFixed(3);
                                if (annreturn.hasOwnProperty("GW"))
                                    gw.aveReturn = annreturn.GW.value.toFixed(3);
                            }
                            tableValues.push(sw);
                            tableValues.push(gw);
                            tableValues.push({
                                name: "Total",
                                aveReturn: (isNaN(+sw.aveReturn) && isNaN(+gw.aveReturn)) ? "---" : ((isNaN(+sw.aveReturn) ? 0 : +sw.aveReturn) + (isNaN(+gw.aveReturn) ? 0 : +gw.aveReturn)).toFixed(3),
                                aveWithdrawal: (isNaN(+sw.aveWithdrawal) && isNaN(+gw.aveWithdrawal)) ? "---" : ((isNaN(+sw.aveWithdrawal) ? 0 : +sw.aveWithdrawal) + (isNaN(+gw.aveWithdrawal) ? 0 : +gw.aveWithdrawal)).toFixed(3)
                            });
                            tableValues.push({ name: "", aveReturn: "", aveWithdrawal: "" });
                            if (this.result.hasOwnProperty("TotalTempStats")) {
                                tableValues.push({ name: "Temporary water use registrations (surface water)[permit]", aveReturn: "", aveWithdrawal: this.result.TotalTempStats[2].value.toFixed(3), unit: "MGD" });
                                tableValues.push({ name: "Temporary water use registrations (groundwater[permit])", aveReturn: "", aveWithdrawal: this.result.TotalTempStats[1].value.toFixed(3), unit: "MGD" });
                                tableValues.push({ name: "Temporary water use registrations (total)[permit]", aveReturn: "", aveWithdrawal: this.result.TotalTempStats[0].value.toFixed(3), unit: "MGD" });
                                tableValues.push({ name: "", aveReturn: "", aveWithdrawal: "" });
                                tableValues.push({ name: "Water use index (dimensionless) without temporary registrations:[totalnet/lowflowstat]", aveReturn: "", aveWithdrawal: this.result.TotalTempStats[4].value.toFixed(3), unit: "Dimensionless" });
                                tableValues.push({ name: "Water use index (dimensionless) with temporary registrations:[permit w/ totalnet/lowflow stat]", aveReturn: "", aveWithdrawal: this.result.TotalTempStats[3].value.toFixed(3), unit: "Dimensionless" });
                            } //end if
                            break;
                    } //end switch
                    return {
                        "values": tableValues,
                        "Fields": tableFields
                    };
                }
                catch (e) {
                    return {
                        "values": [],
                        "Fields": []
                    };
                }
            };
            WateruseController.prototype.Reduce = function (array) {
                return array.reduce(function (a, b) {
                    return (isNaN(+a) && isNaN(+b)) ? "---" : ((isNaN(+a) ? 0 : +a) + (isNaN(+b) ? 0 : +b)).toFixed(3);
                }, 0);
            };
            WateruseController.prototype.Sum = function (objectsToSum, propertyname) {
                var sum = 0;
                for (var item in objectsToSum) {
                    sum += objectsToSum[item][propertyname];
                } //next item
                return sum;
            };
            WateruseController.prototype.Add = function (a, b) {
                return (isNaN(+a) && isNaN(+b)) ? "---" : ((isNaN(+a) ? 0 : +a) + (isNaN(+b) ? 0 : +b)).toFixed(3);
            };
            WateruseController.prototype.DownloadCSV = function () {
                var _this = this;
                var filename = 'wateruseSummary.csv';
                var processAnnualWateruseTable = function () {
                    var finalVal = _this.StartYear + "-" + _this.EndYear + ' Average Annual Water Use reported in million gallons/day\n';
                    finalVal += _this.tableToCSV($('#AnnualWaterUseTable'));
                    return finalVal + '\r\n';
                };
                var ProcessMonthlyWateruseTable = function () {
                    var finalVal = _this.StartYear + "-" + _this.EndYear + ' Average Water Use by Month reported in million gallons/day\n';
                    finalVal += _this.tableToCSV($('#MonthlyWaterUseTable'));
                    return finalVal + '\r\n';
                };
                //main file header with site information
                var csvFile = 'StreamStats Water Use Report' +
                    '\nState/Region ID,' + this.StudyArea.RegionID.toUpperCase() +
                    '\nWorkspace ID,' + this.StudyArea.WorkspaceID +
                    '\nLatitude,' + this.StudyArea.Pourpoint.Latitude.toFixed(5) +
                    '\nLongitude,' + this.StudyArea.Pourpoint.Longitude.toFixed(5) +
                    '\nTime:,' + this.result.processDate.toLocaleString() +
                    '\nStart Year:,' + this.StartYear +
                    '\nEnd Year:,' + this.EndYear +
                    '\r\n';
                //first write main parameter table
                csvFile += processAnnualWateruseTable();
                csvFile += ProcessMonthlyWateruseTable();
                //download
                var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
                if (navigator.msSaveBlob) { // IE 10+
                    navigator.msSaveBlob(blob, filename);
                }
                else {
                    var link = document.createElement("a");
                    var url = URL.createObjectURL(blob);
                    if (link.download !== undefined) { // feature detection
                        // Browsers that support HTML5 download attribute
                        link.setAttribute("href", url);
                        link.setAttribute("download", filename);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    else {
                        window.open(url);
                    }
                }
            };
            WateruseController.prototype.DownloadCSVBySource = function () {
                var _this = this;
                var headers = {
                    "Accept": "text/csv",
                    "Authorization": "Basic dGVzdE1hbmFnZXI6RG9nMQ=="
                };
                var url = configuration.queryparams['WateruseSourceCSV'].format(this.StartYear, this.EndYear, this.includePermits, this.computeReturns, this.computeDomesticWU);
                var studyAreaGeom = this.StudyArea.FeatureCollection.features.filter(function (f) { return (f.id).toLowerCase() == "globalwatershed"; })[0].geometry;
                var request = new WiM.Services.Helpers.RequestInfo(url, false, WiM.Services.Helpers.methodType.POST, "json", angular.toJson(studyAreaGeom), headers);
                this.Execute(request).then(function (response) {
                    var filename = 'wateruseSummaryBySource.csv';
                    var blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                    if (navigator.msSaveBlob) { // IE 10+
                        navigator.msSaveBlob(request, filename);
                    }
                    else {
                        var link = document.createElement("a");
                        var url = URL.createObjectURL(blob);
                        if (link.download !== undefined) { // feature detection
                            // Browsers that support HTML5 download attribute
                            link.setAttribute("href", url);
                            link.setAttribute("download", filename);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                        else {
                            window.open(url);
                        }
                    }
                }, function (error) {
                    var x = error;
                    //sm when error                    
                }).finally(function () {
                    _this.CanContiue = true;
                });
            };
            //Helper Methods
            //-+-+-+-+-+-+-+-+-+-+-+-
            WateruseController.prototype.init = function () {
                var _this = this;
                var url = configuration.queryparams['WateruseConfig'].format(this.StudyArea.RegionID);
                var request = new WiM.Services.Helpers.RequestInfo(url);
                this.Execute(request).then(function (response) {
                    var result = response.data;
                    _this.spanYear = result.minYear != result.maxYear;
                    _this._startYear = result.minYear;
                    _this._endYear = result.maxYear;
                    _this.includePermits = result.hasPermits;
                    _this.computeReturns = result.canComputeReturns;
                    _this.computeDomesticWU = _this.StudyArea.RegionID.toLowerCase() == 'oh';
                    _this._yearRange = { floor: result.minYear, draggableRange: true, noSwitching: true, showTicks: false, ceil: result.maxYear };
                }, function (error) {
                    ;
                    _this._startYear = 2005;
                    _this._endYear = 2012;
                    _this._yearRange = { floor: 2005, draggableRange: true, noSwitching: true, showTicks: false, ceil: 2012 };
                    //sm when error                    
                }).finally(function () {
                    _this.CanContiue = true;
                    _this.showResults = false;
                    _this.SelectedTab = WaterUseTabType.Graph;
                    _this.SelectedWaterUseType = WaterUseType.Annual;
                    _this.ReportData = new WaterUseReportable();
                    _this.MonthlyReportOptions = {
                        chart: {
                            type: 'multiBarHorizontalChart',
                            height: 450,
                            visible: true,
                            stacked: true,
                            showControls: false,
                            margin: {
                                top: 60,
                                right: 30,
                                bottom: 60,
                                left: 55
                            },
                            x: function (d) { return d.label; },
                            y: function (d) { return d.value; },
                            dispatch: {
                                stateChange: function () {
                                    //console.log("StateChange");
                                    //must wrap in timer or method executes prematurely
                                    _this.$timeout(function () {
                                        _this.loadGraphLabels(0);
                                    }, 500);
                                },
                                renderEnd: function () {
                                    //console.log("renderend");
                                    //must wrap in timer or method executes prematurely
                                    _this.$timeout(function () {
                                        _this.loadGraphLabels(0);
                                    }, 500);
                                },
                                resize: function () {
                                    console.log("resize");
                                    //must wrap in timer or method executes prematurely
                                    _this.$timeout(function () {
                                        _this.loadGraphLabels(0);
                                    }, 500);
                                }
                            },
                            showValues: true,
                            valueFormat: function (d) {
                                return d3.format(',.4f')(d);
                            },
                            tooltip: {
                                valueFormatter: function (d) { return d3.format(',.4f')(d) + " million gal/day"; }
                            },
                            xAxis: {
                                showMaxMin: false
                            },
                            yAxis: {
                                axisLabel: 'Values in million gallons/day',
                                tickFormat: function (d) {
                                    return d3.format(',.3f')(d);
                                }
                            },
                            refreshDataOnly: true,
                            legend: {
                                margin: {
                                    top: 5,
                                    right: 40,
                                    left: 40,
                                    bottom: 50
                                }
                            }
                        }
                    };
                    _this.MonthlyReturnReportOptions = {
                        chart: {
                            type: 'multiBarHorizontalChart',
                            height: 450,
                            visible: true,
                            stacked: true,
                            showControls: false,
                            margin: {
                                top: 20,
                                right: 30,
                                bottom: 60,
                                left: 55
                            },
                            x: function (d) { return d.label; },
                            y: function (d) { return d.value; },
                            showValues: true,
                            valueFormat: function (d) {
                                return d3.format(',.3f')(d);
                            },
                            tooltip: {
                                valueFormatter: function (d) {
                                    return d3.format(',.4f')(d) + " million gal/day";
                                }
                            },
                            xAxis: {
                                showMaxMin: false
                            },
                            yAxis: {
                                axisLabel: 'Values in million gallons/day',
                                tickFormat: function (d) {
                                    return d3.format(',.3f')(d);
                                }
                            }
                        }
                    };
                    _this.AnnualReportOptions = {
                        chart: {
                            type: 'pieChart',
                            height: 400,
                            x: function (d) { return d.name; },
                            y: function (d) { return d.value; },
                            showLabels: true,
                            tooltip: {
                                valueFormatter: function (d) { return d3.format(',.4f')(d) + " million gal/day"; }
                            },
                            duration: 500,
                            labelThreshold: 0.01,
                            labelSunbeamLayout: false,
                            legend: {
                                margin: {
                                    top: 5,
                                    right: 35,
                                    bottom: 5,
                                    left: 0
                                }
                            }
                        }
                    };
                });
                $(window).resize(function () {
                    _this.$timeout(function () {
                        _this.loadGraphLabels(0);
                    }, 500);
                });
            };
            WateruseController.prototype.getMonth = function (index) {
                switch (index) {
                    case 1: return "Jan";
                    case 2: return "Feb";
                    case 3: return "Mar";
                    case 4: return "Apr";
                    case 5: return "May";
                    case 6: return "Jun";
                    case 7: return "Jul";
                    case 8: return "Aug";
                    case 9: return "Sep";
                    case 10: return "Oct";
                    case 11: return "Nov";
                    case 12: return "Dec";
                }
            };
            WateruseController.prototype.getWUText = function (wtype) {
                switch (wtype.toUpperCase()) {
                    case "AQ": return "Aquaculture";
                    case "CO": return "Commercial";
                    case "DO": return "Domestic";
                    case "PH": return "Hydro Electric";
                    case "IN": return "Industrial";
                    case "IR": return "Irrigation";
                    case "LV": return "Livestock";
                    case "MI": return "Mining";
                    case "RM": return "Remediation";
                    case "TE": return "Thermoelectric";
                    case "ST": return "Waste Water Treatment";
                    case "WS": return "Public Supply";
                    case "MF": return "Hydrofracturing";
                    case "CW": return "Wetland augmentation";
                    case "PC": return "Thermoelectric (closed cycle)";
                    case "PO": return "Thermoelectric (once through)";
                } //End Switch
                return wtype.toUpperCase();
            };
            WateruseController.prototype.loadGraphLabels = function (id) {
                var svg = d3.selectAll('.nv-multibarHorizontal .nv-group');
                // subtract 2 in order to account for returns
                var lastBarID = svg.map(function (items) { return items.length - 2; });
                var lastBars = svg.filter(function (d, i) {
                    return i == lastBarID[0];
                });
                svg.each(function (group, i) {
                    var g = d3.select(this);
                    // Remove previous labels if there is any
                    g.selectAll('text').remove();
                    g.selectAll('.nv-bar').each(function (bar) {
                        var b = d3.select(this);
                        var barWidth = b.node().getBBox()['width'];
                        var barHeight = b.node().getBBox()['height'];
                        g.append('text')
                            // Transforms shift the origin point then the x and y of the bar
                            // is altered by this transform. In order to align the labels
                            // we need to apply this transform to those.
                            .attr('transform', b.attr('transform'))
                            .text(function () {
                            // Two decimals format
                            if (i >= lastBarID[0])
                                if (bar.y < 0.001) {
                                    return 0;
                                }
                                else {
                                    return d3.format(',.3f')((Number(bar.y) + Number(bar.y0)).toFixed(3));
                                }
                        })
                            .attr("dy", "1.5em")
                            //.attr('y', function () {
                            //    // Center label vertically
                            //    var height = b.node().getBBox().height;
                            //    return parseFloat(b.attr('y')) - 10; // 10 is the label's margin from the bar
                            //})
                            .attr('x', function () {
                            var width = this.getBBox().width;
                            return barWidth - width / 2;
                        })
                            .attr('class', 'bar-values');
                    });
                });
            };
            WateruseController.prototype.generateColorShade = function (minhue, maxhue) {
                try {
                    var h = this.rand(minhue, minhue);
                    var s = this.rand(30, 100);
                    var l = this.rand(30, 70);
                    return 'hsla(' + h + ',' + s + '%,' + l + '%,1)';
                }
                catch (e) {
                    return null;
                }
            };
            WateruseController.prototype.tableToCSV = function ($table) {
                var $headers = $table.find('tr:has(th)'), $rows = $table.find('tr:has(td)')
                // Temporary delimiter characters unlikely to be typed by keyboard
                // This is to avoid accidentally splitting the actual contents
                , tmpColDelim = String.fromCharCode(11) // vertical tab character
                , tmpRowDelim = String.fromCharCode(0) // null character
                // actual delimiter characters for CSV format
                , colDelim = '","', rowDelim = '"\r\n"';
                // Grab text from table into CSV formatted string
                var csv = '"';
                csv += formatRows($headers.map(grabRow));
                csv += rowDelim;
                csv += formatRows($rows.map(grabRow)) + '"';
                return csv;
                //------------------------------------------------------------
                // Helper Functions 
                //------------------------------------------------------------
                // Format the output so it has the appropriate delimiters
                function formatRows(rows) {
                    return rows.get().join(tmpRowDelim)
                        .split(tmpRowDelim).join(rowDelim)
                        .split(tmpColDelim).join(colDelim);
                }
                // Grab and format a row from the table
                function grabRow(i, row) {
                    var $row = $(row);
                    //for some reason $cols = $row.find('td') || $row.find('th') won't work...
                    var $cols = $row.find('td');
                    if (!$cols.length)
                        $cols = $row.find('th');
                    return $cols.map(grabCol)
                        .get().join(tmpColDelim);
                }
                // Grab and format a column from the table 
                function grabCol(j, col) {
                    var $col = $(col), $text = $col.text();
                    return $text.replace('"', '""'); // escape double quotes
                }
            }; //end tableToCSV
            WateruseController.prototype.HSLtoRGB = function (h, s, l) {
                // hsl in set of 0-1
                var r, g, b;
                if (s == 0) {
                    r = g = b = l; // achromatic
                }
                else {
                    var hue2rgb = function hue2rgb(p, q, t) {
                        if (t < 0)
                            t += 1;
                        if (t > 1)
                            t -= 1;
                        if (t < 1 / 6)
                            return p + (q - p) * 6 * t;
                        if (t < 1 / 2)
                            return q;
                        if (t < 2 / 3)
                            return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    };
                    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    var p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }
                return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
            };
            WateruseController.prototype.RGBtoHEX = function (r, g, b) {
                var red = this.ToHex(r);
                var green = this.ToHex(g);
                var blue = this.ToHex(b);
                return red + green + blue;
            };
            WateruseController.prototype.ToHex = function (item) {
                var hex = Number(item).toString(16);
                if (hex.length < 2) {
                    hex = "0" + hex;
                }
                return hex;
            };
            WateruseController.prototype.rand = function (min, max) {
                return parseInt((Math.random() * (max - min + 1)), 10) + min;
            };
            //Constructor
            //-+-+-+-+-+-+-+-+-+-+-+-
            WateruseController.$inject = ['$scope', '$http', 'StreamStats.Services.StudyAreaService', '$modalInstance', '$timeout'];
            return WateruseController;
        }(WiM.Services.HTTPServiceBase)); //end wimLayerControlController class
        var WaterUseType;
        (function (WaterUseType) {
            WaterUseType[WaterUseType["Annual"] = 1] = "Annual";
            WaterUseType[WaterUseType["Monthly"] = 2] = "Monthly";
        })(WaterUseType || (WaterUseType = {}));
        var WaterUseTabType;
        (function (WaterUseTabType) {
            WaterUseTabType[WaterUseTabType["Graph"] = 1] = "Graph";
            WaterUseTabType[WaterUseTabType["Table"] = 2] = "Table";
        })(WaterUseTabType || (WaterUseTabType = {}));
        angular.module('StreamStats.Controllers')
            .controller('StreamStats.Controllers.WateruseController', WateruseController);
    })(Controllers = StreamStats.Controllers || (StreamStats.Controllers = {}));
})(StreamStats || (StreamStats = {})); //end module 
//# sourceMappingURL=WateruseController.js.map