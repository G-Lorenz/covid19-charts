  // original code by: izmegabe@gmail.com
  // extracted from: https://github.com/gabgoh/epcalc
  // adapted by: E.P.
  
function range(n){
    return Array(n).fill().map(function(_, i) {return i});
}

function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
 }

var sum = function(arr, bools){
    var x = 0
    for (var i = 0; i < arr.length; i++) {
      x = x + arr[i]*(bools[i] ? 1 : 0)
    }
    return x
}

var Integrators = {
    Euler    : [[1]],
    Midpoint : [[.5,.5],[0, 1]],
    Heun     : [[1, 1],[.5,.5]],
    Ralston  : [[2/3,2/3],[.25,.75]],
    K3       : [[.5,.5],[1,-1,2],[1/6,2/3,1/6]],
    SSP33    : [[1,1],[.5,.25,.25],[1/6,1/6,2/3]],
    SSP43    : [[.5,.5],[1,.5,.5],[.5,1/6,1/6,1/6],[1/6,1/6,1/6,1/2]],
    RK4      : [[.5,.5],[.5,0,.5],[1,0,0,1],[1/6,1/3,1/3,1/6]],
    RK38     : [[1/3,1/3],[2/3,-1/3,1],[1,1,-1,1],[1/8,3/8,3/8,1/8]]
  };

// f is a func of time t and state y
// y is the initial state, t is the time, h is the timestep
// updated y is returned.
function integrate(m,f,y,t,h){
    for (var k=[],ki=0; ki<m.length; ki++) {
      var _y=y.slice(), dt=ki?((m[ki-1][0])*h):0;
      for (var l=0; l<_y.length; l++) for (var j=1; j<=ki; j++) _y[l]=_y[l]+h*(m[ki-1][j])*(k[ki-1][l]);
      k[ki]=f(t+dt,_y,dt); 
    }
    for (var r=y.slice(),l=0; l<_y.length; l++) for (var j=0; j<k.length; j++) r[l]=r[l]+h*(k[j][l])*(m[ki-1][j]);
    return r;
}

// dt, N, I0, R0, D_incubation, D_infectious, D_recovery_mild, D_hospital_lag, D_recovery_severe, D_death, P_SEVERE, CFR, InterventionTime, InterventionAmt

epcalc_params = [
  "dt", "N", "I0", 
  "D_incubation", "D_infectious", "D_recovery_mild", "D_hospital_lag", "D_recovery_severe", 
  "Time_to_death", "P_SEVERE", "CFR",
  "R0", "day_1", "R1", "day_2", "R2", "day_end"
];

function get_solution(params) {
    const params_dt = params.dt; // days between output samples
    const N = params.N; // population
    const I0 = params.I0;
    const D_incubation = params.D_incubation;
    const D_infectious = params.D_infectious;
    const D_recovery_mild = params.D_recovery_mild;
    const D_hospital_lag = params.D_hospital_lag;
    const D_recovery_severe = params.D_recovery_severe;
    const D_death = params.Time_to_death - params.D_infectious;
    const P_SEVERE = params.P_SEVERE;
    const CFR = params.CFR;
    
    var current_R;

    var method = Integrators["RK4"]
    function f(t, x){
      // SEIR ODE
      var a     = 1/D_incubation
      var gamma = 1/D_infectious
      
      var S        = x[0] // Susectable
      var E        = x[1] // Exposed
      var I        = x[2] // Infectious 
      var Mild     = x[3] // Recovering (Mild)     
      var Severe   = x[4] // Recovering (Severe at home)
      var Severe_H = x[5] // Recovering (Severe in hospital)
      var Fatal    = x[6] // Recovering (Fatal)
      var R_Mild   = x[7] // Recovered
      var R_Severe = x[8] // Recovered
      var R_Fatal  = x[9] // Dead

      var p_severe = P_SEVERE
      var p_fatal  = CFR
      var p_mild   = 1 - P_SEVERE - CFR

      var beta = current_R / D_infectious;

      var dS        = -beta*I*S
      var dE        =  beta*I*S - a*E
      var dI        =  a*E - gamma*I
      var dMild     =  p_mild*gamma*I   - (1/D_recovery_mild)*Mild
      var dSevere   =  p_severe*gamma*I - (1/D_hospital_lag)*Severe
      var dSevere_H =  (1/D_hospital_lag)*Severe - (1/D_recovery_severe)*Severe_H
      var dFatal    =  p_fatal*gamma*I  - (1/D_death)*Fatal
      var dR_Mild   =  (1/D_recovery_mild)*Mild
      var dR_Severe =  (1/D_recovery_severe)*Severe_H
      var dR_Fatal  =  (1/D_death)*Fatal

      //      0   1   2   3      4        5          6       7        8          9
      return [dS, dE, dI, dMild, dSevere, dSevere_H, dFatal, dR_Mild, dR_Severe, dR_Fatal]
    }

    var interpolation_steps = 40
    var steps = 110*interpolation_steps
    var dt = params_dt/interpolation_steps

    var v = [1 - I0/N, 0, I0/N, 0, 0, 0, 0, 0, 0, 0]
    var t = 0

    var Iters = []
    for (var step=0; ; ++step) { 

      if (t < params.day_1) {
        current_R = params.R0;
      } else if (t < params.day_2) {
        current_R = params.R1;
      } else if (t < params.day_end) {
        current_R = params.R2;
      } else {
        break;
      }

      if ((step % interpolation_steps) === 0) {
        Iters.push(v)
      }
      v = integrate(method,f,v,t,dt); 
      t+=dt
    }
    return Iters;
  }
