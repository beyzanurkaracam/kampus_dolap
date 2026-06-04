variable "project_id"   { type = string }
variable "region"       { type = string }
variable "cluster_name" { type = string }

resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  enable_autopilot    = true
  deletion_protection = false

  release_channel {
    channel = "REGULAR"
  }
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}
