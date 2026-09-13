# Security Specification - MediTrack

## Data Invariants
1. **Clinic Isolation**: A user can only access patients and consultations belonging to their assigned `clinicId`.
2. **Identity Integrity**: Users cannot spoof their `uid` or `email` in the `users` collection.
3. **Role Enforcement**: Only users with the `admin` role or the hardcoded system admin email can perform destructive operations or access cross-clinic data.
4. **Patient Integrity**: All patients must have a `clinicId`, `name`, `phone`, and `addedBy` UID.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Cross-Clinic Query**: A user from Clinic A tries to list patients from Clinic B.
2. **Identity Change**: A user tries to update their profile to change their `role` to `admin`.
3. **Ghost Patient**: Create a patient with a missing `clinicId`.
4. **UID Spoofing**: Create a patient where `addedBy` is not the current user's UID.
5. **Admin Spoofing**: Signed-in user (not admin) tries to delete a clinic.
6. **Orphaned Consultation**: Create a consultation for a non-existent clinic.
7. **Terminal State Bypass**: Attempt to move a patient from 'Completed' back to 'Waiting' (if state locking is enforced).
8. **PII Leak**: Non-clinic member tries to 'get' a specific patient's details.
9. **Role Injection**: Self-assign 'admin' role during signup.
10. **Timestamp Fraud**: Provide a future `timestamp` for a consultation.
11. **Large ID**: Inject a 1MB string as a document ID.
12. **Blanket Read**: Query `/patients` without any filters as a non-admin.

## The Test Runner (Plan)
We will verify that these payloads return PERMISSION_DENIED.
