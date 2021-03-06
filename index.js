$.datepicker.setDefaults({
    dateFormat: "yy-mm-dd"
});

var datasets = {
    'dpc_nazione': new DpcNazionaleDataset(),
    'dpc_regioni': new DpcRegioniDataset(),
    'dpc_province': new DpcProvinceDataset(),
    'vaccini_somministrazione': new VacciniSomministrazioneSummaryDataset(),
    'hopkins_confirmed': new HopkinsConfirmedDataset(),
    'hopkins_deaths': new HopkinsDeathsDataset(),
    'hopkins_recovered': new HopkinsRecoveredDataset(),
    'hopkinsUS_confirmedUS': new HopkinsConfirmedUSDataset(),
    'hopkinsUS_deathsUS': new HopkinsDeathsUSDataset(),
    'epcalc': new EpcalcDataset(),
    'lockdown': new LockdownDataset()
}

var chart;
var replay = [];
const hash_prefix = "#options=";

function set_location_hash() {
    var options = {
        version: 2,
        datasets: replay, // should be named serieses
        chart: chart.get_options(),
        epcalc_input: datasets.epcalc.current_input
    }
    var hash = hash_prefix + encodeURIComponent(JSON.stringify(options));
    history.pushState(null, null, hash)
}

function get_location_hash() {
    var hash = window.location.hash;
    if (hash.substring(0,hash_prefix.length) !== hash_prefix) return {};
    hash = hash.substring(hash_prefix.length);
    var json = decodeURIComponent(hash);
    var options = JSON.parse(json);
    if (options.version === 1) {
        if (options.period) {
            options.filter += ' ' + options.period;
        }
    }
    return options;
}

$(function () {
    chart = new ChartWrapper();
    var options = get_location_hash();

    Promise.all(Object.entries(datasets).map(function(pair){ 
        if (pair[0] === 'epcalc' && options.hasOwnProperty('epcalc_input')) {
            return pair[1].setup(options.epcalc_input);
        } else {
            return pair[1].setup();
        }
    })).then(function() {
            if (options.hasOwnProperty('chart')) {            
                chart.set_options(options['chart']);
            } 
            if (options.hasOwnProperty('datasets')) {
                options['datasets'].forEach(function(item) {
                    var key = {
                        italia: "dpc_nazione",
                        regioni: "dpc_regioni",
                        province: "dpc_province",
                        confirmed: "hopkins_confirmed",
                        deaths: "hopkins_deaths",
                        recovered: "hopkins_recovered",    
                        epcalc: "epcalc",
                        lockdown: "lockdown",
                        deathsUS: "hopkinsUS_deathsUS",
                        confirmedUS: "hopkinsUS_confirmedUS",
                        somministrazione: "vaccini_somministrazione"
                    }[item.dataset];
                    if (item.options.column === "nuovi_attualmente_positivi") {
                        item.options.column = "nuovi_positivi";
                    }
                    datasets[key].add_series(item.options);
                })
            }
            $("button[name='create_url']").click(set_location_hash);
        });

    var data_set = {
        'epcalc': 'epcalc',
        'lockdown': 'lockdown'
    };

    $(".dataset_select").change(function(){
        var val = $(this).val();
        var vals = val.split("_");
        $("." + vals[0]).hide();
        $("." + vals[0] + "." + vals[1]).show();
        $("." + vals[0] + "." + vals[1] + ".hide").hide();
        data_set[vals[0]] = val;
    }).change();

    var $data_source = $("select[name='data_source']");
    var data_source;
    
    $data_source.change(function(){
        var val = $(this).val();
        $(".data_source").hide();
        $("#" + val + "_box").show();
        data_source = val;
        $filter_li = $("#series_filter_li");
        if (datasets[data_set[data_source]].can_be_filtered) {
            $filter_li.show();
        } else {
            $filter_li.hide();
        }    
    }).change();    

    $("button[name='plot']").click(function(){
        datasets[data_set[data_source]].click();
    });

    $("select[name='filter']").change(function(){ 
        var val = $(this).val();
        var $period_span = $("#period_span");
        $period_span.toggle(val !== "identity")
    }).change();

    $("select.dataset_select").change(function(){ 
        var val = $(this).val();
        var $modifier_span = $("#modifier_span");
        $modifier_span.toggle(val !== "dpc_province");
    }).change();


});
