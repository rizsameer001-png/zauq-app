# Security Specification - Zauq Videos Collection

## 1. Data Invariants
1. **Public Readability**: Anyone, whether authenticated or not, can read (get/list) videos in the public lounge.
2. **Authenticated Mutation**: Only authenticated users (admins/sandbox users) can create, update, or delete video documents.
3. **Strict Schema Constraints**:
   - `id`: Must be a valid alphanumeric/hyphen/underscore string up to 128 chars.
   - `title`: Must be a string with a size between 1 and 200 characters.
   - `artist`: Must be a string with a size between 1 and 200 characters.
   - `url`: Must be a valid URL string, with a size between 10 and 2048 characters.
   - `category`: Must be a string with a size between 1 and 100 characters.
   - `description`: Optional string, size up to 2000 characters if present.
   - `createdAt`: Must be a timestamp, set strictly to the server's request time during creation.
4. **Immutability of Key Fields**: Once created, `id` and `createdAt` cannot be modified.

---

## 2. The "Dirty Dozen" Payloads (TDD Test Scenarios)

We define 12 payloads representing malicious writes that **MUST** be rejected by security rules:

1. **Unauthenticated Creation**: A non-signed-in client attempts to create a video document.
2. **Unauthenticated Deletion**: A non-signed-in client attempts to delete a video document.
3. **Empty Title Injection**: An authenticated user tries to save a video with an empty or missing `title`.
4. **Giant Payload Attack**: An authenticated user tries to inject a massive description (1MB) to cause excessive storage usage.
5. **ID Poisoning / Path Resource Attack**: An attacker tries to create a video with a document ID containing special characters (e.g. `../../bad_path`).
6. **Self-Appointed Timestamp / Client clock spoofing**: A user submits a video where `createdAt` is a past/future time instead of `request.time`.
7. **Missing Mandatory Field**: A user submits a video payload missing the `artist` key.
8. **Field Type Mismatch (Spoofing Booleans)**: A user submits `title` as a boolean (`true`) instead of a string.
9. **Shadow Field Injection**: A user submits a payload with an extra unauthorized property `isSystemApproved: true` to bypass verification systems.
10. **Malicious URL Expansion**: A user attempts to submit a 10KB string of garbage as the `url` value.
11. **Immutability Breach**: An authenticated user attempts to update the immutable `createdAt` timestamp field.
12. **Tampering with Identifier**: An authenticated user attempts to update the `id` field of an existing video document to point to a different value.

---

## 3. Test Verification (Rule Assertions)

The following security rules logic handles verification:

```javascript
function isValidVideo(data) {
  return data.id is string && data.id.size() <= 128
      && data.title is string && data.title.size() >= 1 && data.title.size() <= 200
      && data.artist is string && data.artist.size() >= 1 && data.artist.size() <= 200
      && data.url is string && data.url.size() >= 10 && data.url.size() <= 2048
      && data.category is string && data.category.size() >= 1 && data.category.size() <= 100
      && (!('description' in data) || (data.description is string && data.description.size() <= 2000))
      && data.createdAt == request.time;
}
```

Every single payload from the Dirty Dozen must fail compilation/evaluation with `PERMISSION_DENIED` on these collections.
