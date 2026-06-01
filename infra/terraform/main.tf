module "gke" {
  source       = "./modules/gke"
  project_id   = var.project_id
  region       = var.region
  cluster_name = var.cluster_name
}

module "iam" {
  source         = "./modules/iam"
  project_id     = var.project_id
  project_number = var.project_number
}

module "wif" {
  source         = "./modules/wif"
  project_id     = var.project_id
  project_number = var.project_number
  github_repo    = var.github_repo
}

module "monitoring" {
  source     = "./modules/monitoring"
  project_id = var.project_id
}
