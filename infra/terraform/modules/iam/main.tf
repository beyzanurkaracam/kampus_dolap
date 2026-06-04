variable "project_id"     { type = string }
variable "project_number" { type = string }

resource "google_service_account" "github_actions" {
  account_id   = "github-actions"
  display_name = "github-actions"
  project      = var.project_id
}

resource "google_project_iam_member" "github_actions_gke_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${var.project_number}/locations/global/workloadIdentityPools/github-pool/attribute.repository/beyzanurkaracam/kampus_dolap"
}

output "github_actions_sa_email" {
  value = google_service_account.github_actions.email
}
