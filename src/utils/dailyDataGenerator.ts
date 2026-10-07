/**
 * Daily Data Utilities for MediTrack
 * Strictly adheres to 100% Real Live Clinic Data.
 * Zero hardcoded or mock patients are seeded.
 */

export interface SeedDoctorInfo {
  uid: string;
  id?: string;
  doctorId?: string;
  name: string;
  email: string;
  category?: "GP" | "PEDIATRICIAN" | "DENTIST" | string;
}

export interface SeedReceptionistInfo {
  uid: string;
  id?: string;
  receptionistId?: string;
  name: string;
  email: string;
}
