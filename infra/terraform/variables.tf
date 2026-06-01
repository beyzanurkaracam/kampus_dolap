variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_number" {
  description = "GCP project number"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west3"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "kampusumden-cluster"
}

variable "github_repo" {
  description = "GitHub repository in org/repo format"
  type        = string
  default     = "beyzanurkaracam/kampus_dolap"
}
