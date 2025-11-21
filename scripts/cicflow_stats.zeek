# zeek script: cicflow_stats.zeek
# -------------------------------------------------------------
# Emite cicflow.log con métricas inspiradas en CICFlowMeter para
# que modelos entrenados sobre CICIDS2017 puedan operar sobre
# tráfico Zeek en vivo.
#
# El registro resultante incluye:
#  - Campos base de conn.log (ts, uid, id.orig_*, id.resp_*, duration)
#  - Estadísticas forward/backward por conexión (paquetes, bytes, medias)
#  - Aproximaciones a las 20 features prioritarias del modelo RF
#
# Uso típico:
#   sudo /usr/local/zeek/bin/zeek -i ens33 /home/ubuntu/scripts/cicflow_stats.zeek
#   tail -f /usr/local/zeek/logs/current/cicflow.log
#

module CICFlow;

export {
    redef enum Log::ID += { LOG };

    # Registro almacenado en cicflow.log (alineado a top-20 CICIDS)
    type Record: record {
        ts:                   time     &log;
        uid:                  string   &log;
        id_orig_h:            addr     &log;
        id_orig_p:            port     &log;
        id_resp_h:            addr     &log;
        id_resp_p:            port     &log;
        duration:             interval &log;

        total_fwd_pkts:       count    &log;
        total_bwd_pkts:       count    &log;
        total_fwd_len:        double   &log;
        total_bwd_len:        double   &log;

        fwd_pkt_len_min:      double   &log;
        fwd_pkt_len_mean:     double   &log;
        bwd_pkt_len_min:      double   &log;
        bwd_pkt_len_mean:     double   &log;
        bwd_pkt_len_max:      double   &log;
        bwd_pkt_len_std:      double   &log;
        pkt_len_mean:         double   &log;
        min_pkt_len:          double   &log;

        avg_fwd_seg_size:     double   &log;
        avg_bwd_seg_size:     double   &log;
        bwd_pkts_per_sec:     double   &log;

        psh_flag_count:       count    &log;
        subflow_fwd_pkts:     count    &log;
        act_data_pkt_fwd:     count    &log;
        idle_min:             interval &log;

        dst_port:             port     &log;
        min_seg_size_forward: double   &log;
        init_win_bytes_bwd:   double   &log;
    };
}

# Estructura interna para acumular métricas por conexión
const INF: double = 9.223372e18;

type FlowStats: record {
    start_ts:           time;
    last_pkt_ts:        time;
    min_iat:            interval;

    init_win_bwd:       double;

    fwd_pkts:           count;
    bwd_pkts:           count;
    fwd_bytes:          double;
    bwd_bytes:          double;

    fwd_len_min:        double;
    bwd_len_min:        double;
    bwd_len_max:        double;

    fwd_len_sum:        double;
    bwd_len_sum:        double;
    bwd_len_sumsq:      double;

    payload_fwd_pkts:   count;
    psh_flags:          count;
};

global stats: table[string] of FlowStats;

event zeek_init() &priority=5
    {
    Log::create_stream(CICFlow::LOG, [$columns = Record, $path = "cicflow"]);
    }

# Inicializa la estructura de stats para una conexión nueva
function init_stats(): FlowStats
    {
    local now = network_time();
    local fs: FlowStats;

    fs$start_ts      = now;
    fs$last_pkt_ts   = now;
    fs$min_iat       = 0secs;

    fs$init_win_bwd  = 0.0;

    fs$fwd_pkts      = 0;
    fs$bwd_pkts      = 0;
    fs$fwd_bytes     = 0.0;
    fs$bwd_bytes     = 0.0;

    fs$fwd_len_min   = INF;
    fs$bwd_len_min   = INF;
    fs$bwd_len_max   = 0.0;

    fs$fwd_len_sum   = 0.0;
    fs$bwd_len_sum   = 0.0;
    fs$bwd_len_sumsq = 0.0;

    fs$payload_fwd_pkts = 0;
    fs$psh_flags        = 0;

    return fs;
    }

event new_connection(c: connection)
    {
    stats[c$uid] = init_stats();
    }

function safe_mean(sum: double, n: count): double
    {
    if ( n == 0 )
        return 0.0;
    return sum / n;
    }

function safe_std(sum: double, sumsq: double, n: count): double
    {
    if ( n <= 1 )
        return 0.0;
    local mean = sum / n;
    local variance = (sumsq / n) - (mean * mean);
    if ( variance <= 0.0 )
        return 0.0;
    return sqrt(variance);
    }

# Evento por cada paquete TCP visto
event tcp_packet(c: connection, is_orig: bool, flags: string,
                 seq: count, ack: count, len: count, payload: string)
    {
    if ( c$uid !in stats )
        return;

    local st = stats[c$uid];
    local now = network_time();

    # Idle Min: mínimo inter-arrival time
    local iat = now - st$last_pkt_ts;
    if ( iat > 0secs && (st$min_iat == 0secs || iat < st$min_iat) )
        st$min_iat = iat;
    st$last_pkt_ts = now;

    if ( is_orig )
        {
        st$fwd_pkts += 1;
        st$fwd_bytes += len;
        st$fwd_len_sum += len;

        if ( len < st$fwd_len_min )
            st$fwd_len_min = len;

        # act_data_pkt_fwd ~ paquetes con payload
        if ( len > 0 )
            st$payload_fwd_pkts += 1;
        }
    else
        {
        st$bwd_pkts += 1;
        st$bwd_bytes += len;
        st$bwd_len_sum += len;
        st$bwd_len_sumsq += len * len;

        if ( len < st$bwd_len_min )
            st$bwd_len_min = len;
        if ( len > st$bwd_len_max )
            st$bwd_len_max = len;

        # Init_Win_bytes_backward no disponible en esta build → dejamos 0.0
        }

    # Contar PSH flags
    if ( /P/ in flags )
        st$psh_flags += 1;

    stats[c$uid] = st;
    }

event connection_state_remove(c: connection)
    {
    if ( c$uid !in stats )
        return;

    local st = stats[c$uid];
    delete stats[c$uid];

    # Duration: usar c$duration si existe, sino desde los timestamps
    local dur: interval = 0secs;
    if ( c?$duration )
        dur = c$duration;
    else
        dur = st$last_pkt_ts - st$start_ts;

    if ( dur <= 0secs )
        dur = 1e-6secs;  # evitar división por cero

    local total_pkts = st$fwd_pkts + st$bwd_pkts;
    local total_len  = st$fwd_bytes + st$bwd_bytes;

    local pkt_len_mean = safe_mean(total_len, total_pkts);

    # Min Packet Length: mínimo entre fwd y bwd, ignorando inf
    local min_pkt_len = 0.0;
    if ( st$fwd_len_min < INF || st$bwd_len_min < INF )
        {
        if ( st$fwd_len_min < st$bwd_len_min )
            min_pkt_len = st$fwd_len_min;
        else
            min_pkt_len = st$bwd_len_min;
        }

    # Desviación estándar de longitudes BWD
    local bwd_std = safe_std(st$bwd_len_sum, st$bwd_len_sumsq, st$bwd_pkts);

    # Bwd pkts/s
    local dur_secs = dur / 1sec;
    if ( dur_secs <= 0.0 )
        dur_secs = 1e-6;
    local bwd_pkts_per_sec = st$bwd_pkts / dur_secs;

    local rec = Record(
        $ts                 = st$start_ts,
        $uid                = c$uid,
        $id_orig_h          = c$id$orig_h,
        $id_orig_p          = c$id$orig_p,
        $id_resp_h          = c$id$resp_h,
        $id_resp_p          = c$id$resp_p,
        $duration           = dur,

        $total_fwd_pkts     = st$fwd_pkts,
        $total_bwd_pkts     = st$bwd_pkts,
        $total_fwd_len      = st$fwd_bytes,
        $total_bwd_len      = st$bwd_bytes,

        $fwd_pkt_len_min    = st$fwd_len_min == INF ? 0.0 : st$fwd_len_min,
        $fwd_pkt_len_mean   = safe_mean(st$fwd_len_sum, st$fwd_pkts),
        $bwd_pkt_len_min    = st$bwd_len_min == INF ? 0.0 : st$bwd_len_min,
        $bwd_pkt_len_mean   = safe_mean(st$bwd_len_sum, st$bwd_pkts),
        $bwd_pkt_len_max    = st$bwd_len_max,
        $bwd_pkt_len_std    = bwd_std,
        $pkt_len_mean       = pkt_len_mean,
        $min_pkt_len        = min_pkt_len,

        $avg_fwd_seg_size   = safe_mean(st$fwd_bytes, st$fwd_pkts),
        $avg_bwd_seg_size   = safe_mean(st$bwd_bytes, st$bwd_pkts),
        $bwd_pkts_per_sec   = bwd_pkts_per_sec,

        $psh_flag_count     = st$psh_flags,
        $subflow_fwd_pkts   = st$fwd_pkts,
        $act_data_pkt_fwd   = st$payload_fwd_pkts,
        $idle_min           = st$min_iat,

        $dst_port           = c$id$resp_p,
        $min_seg_size_forward = safe_mean(st$fwd_bytes, st$fwd_pkts),
        $init_win_bytes_bwd = st$init_win_bwd
    );

    Log::write(CICFlow::LOG, rec);
    }
