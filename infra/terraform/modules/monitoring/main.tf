variable "project_id" { type = string }
variable "alert_email" { type = string }

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "Kampüsümden Alerts — Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_dashboard" "kampusumden" {
  project = var.project_id

  lifecycle {
    ignore_changes = [dashboard_json]
  }

  dashboard_json = jsonencode({
    displayName = "Kampüsümden — Production"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "Container Restarts"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"kubernetes.io/container/restart_count\" resource.type=\"k8s_container\" resource.label.\"cluster_name\"=\"kampusumden-cluster\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                      groupByFields      = []
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "CPU Usage"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"kubernetes.io/container/cpu/request_utilization\" resource.type=\"k8s_container\" resource.label.\"cluster_name\"=\"kampusumden-cluster\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                      groupByFields      = []
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },
        {
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Memory Usage"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"kubernetes.io/container/memory/request_utilization\" resource.type=\"k8s_container\" resource.label.\"cluster_name\"=\"kampusumden-cluster\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_MEAN"
                      crossSeriesReducer = "REDUCE_MEAN"
                      groupByFields      = []
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        }
      ]
    }
  })
}

resource "google_monitoring_alert_policy" "pod_restarts" {
  project      = var.project_id
  display_name = "Pod Restart Alert"
  combiner     = "OR"

  conditions {
    display_name = "Pod restart count > 3 in 10 minutes"
    condition_threshold {
      filter          = "metric.type=\"kubernetes.io/container/restart_count\" resource.type=\"k8s_container\" resource.label.\"cluster_name\"=\"kampusumden-cluster\" resource.label.\"namespace_name\"=monitoring.regex.full_match(\"production|staging\")"
      duration        = "0s"
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      aggregations {
        alignment_period   = "600s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "604800s"
  }
}

resource "google_monitoring_alert_policy" "high_memory" {
  project      = var.project_id
  display_name = "High Memory Utilization"
  combiner     = "OR"

  conditions {
    display_name = "Container memory request utilization > 85%"
    condition_threshold {
      filter          = "metric.type=\"kubernetes.io/container/memory/request_utilization\" resource.type=\"k8s_container\" resource.label.\"cluster_name\"=\"kampusumden-cluster\" resource.label.\"namespace_name\"=monitoring.regex.full_match(\"production|staging\")"
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "604800s"
  }
}

resource "google_monitoring_alert_policy" "lb_error_rate" {
  project      = var.project_id
  display_name = "Load Balancer 5xx Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "HTTP 5xx responses > 5/s over 5 minutes"
    condition_threshold {
      filter          = "metric.type=\"loadbalancing.googleapis.com/https/request_count\" resource.type=\"https_lb_rule\" metric.label.\"response_code_class\"=\"500\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "604800s"
  }
}

resource "google_monitoring_alert_policy" "lb_latency" {
  project      = var.project_id
  display_name = "Load Balancer p95 Latency"
  combiner     = "OR"

  conditions {
    display_name = "p95 request latency > 1000ms over 5 minutes"
    condition_threshold {
      filter          = "metric.type=\"loadbalancing.googleapis.com/https/total_latencies\" resource.type=\"https_lb_rule\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1000
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "604800s"
  }
}
