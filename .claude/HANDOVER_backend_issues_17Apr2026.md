# Backend Issue Handover — 17 April 2026

Branch: `bugfix-doc-upload`  
Related PR: `customer-product-info` → `dev_release` (Merged as PR 5144)

---

## Issue 1 — Upload returning 404 (RESOLVED: rebuild required)

### Symptom
`POST https://localhost:7128/api/CustomerDocument/Upload?entityKey=...` returns **404 Not Found**.  
Frontend shows "Upload failed. Please try again."

### Root Cause
`CustomerDocumentController` is committed on `bugfix-doc-upload` and the route is correct.  
The 404 occurs because the backend binary was built **before** PR 5147 ("build issue fix") was applied locally.  
PR 5146 (lesson APIs) introduced a build error; PR 5147 fixed it by removing an unused `using Speccon.Tap.Services;` from `Program.cs`.  
Any backend process started from the broken intermediate state will not have `CustomerDocumentController` registered.

### Fix
Stop the backend, **clean rebuild**, restart:

```bash
dotnet build src-tap/Presentation/Speccon.Tap.Crm/Speccon.Tap.Crm.csproj
dotnet run --project src-tap/Presentation/Speccon.Tap.Crm/Speccon.Tap.Crm.csproj
```

Or in Visual Studio: **Build → Clean Solution → Rebuild Solution → Run**.

### Verification
```
GET https://localhost:7128/api/CustomerDocument/GetByCustomer?customerKey=6fbfc6f1-0030-4d99-9408-474856e8a500
```
A `401 Unauthorized` (not `404`) confirms the controller is registered and routing correctly.

---

## Issue 2 — Package downgrade build error (FIXED in working tree)

### Symptom
```
Warning As Error: Detected package downgrade: Microsoft.Extensions.Logging.Abstractions from 8.0.3 to 8.0.2.
Speccon.Tap.Services.Test → Speccon.Tap.Functions → OpenAI 2.1.0 → System.ClientModel 1.6.1
  → Microsoft.Extensions.Logging.Abstractions (>= 8.0.3)
Speccon.Tap.Services.Test → Microsoft.Extensions.Logging.Abstractions (>= 8.0.2)
```

### Root Cause
`Speccon.Tap.Services.Test.csproj` pinned `Microsoft.Extensions.Logging.Abstractions` at `8.0.2`.  
Transitive dependency via `OpenAI 2.1.0 → System.ClientModel 1.6.1` requires `>= 8.0.3`.  
With `TreatWarningsAsErrors` enabled this is a hard build failure.

### Fix Applied
File: `src-tap/Services/Speccon.Tap.Services.Test/Speccon.Tap.Services.Test.csproj`

```xml
<!-- Changed line 14 from: -->
<PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="8.0.2" />
<!-- To: -->
<PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="8.0.3" />
```

**Status:** Edit made in working tree. Needs to be committed and pushed by the resolver.

---

## Issue 3 — FileUrl returns relative path instead of full Azure Blob URL (PENDING)

### Symptom
`GET /api/CustomerDocument/GetByCustomer` returns `fileUrl` as:
```
Uploads/CRM/CustomerDocuments/{customerKey}/file.png?sv=...
```
Frontend treats this as relative to the current page, producing:
```
http://localhost:3000/customers/Uploads/CRM/CustomerDocuments/...
```
On the published environment this will break links/downloads.

### Root Cause
`CustomerDocumentController` uses `_blobStorageService.AddSasToken(d.FilePath)` which only appends the SAS token to the relative path. It does not prepend the Azure base URL.  
All other services in the codebase use `AzureBlobPathProvider.ResolveBlobUrl()` which correctly builds:
```
https://devstoragetap.blob.core.windows.net/tap-file-repository/Uploads/CRM/CustomerDocuments/{key}/file.png?sv=...
```

### Fix Required
File: `src-tap/Presentation/Speccon.Tap.Crm/Controllers/CustomerDocumentController.cs`

Two replacements needed:

**In `GetByCustomer` (the LINQ Select projection):**
```csharp
// Before
FileUrl = _blobStorageService.AddSasToken(d.FilePath),
// After
FileUrl = AzureBlobPathProvider.ResolveBlobUrl(d.FilePath, string.Empty),
```

**In `Upload` (the return DTO):**
```csharp
// Before
FileUrl = _blobStorageService.AddSasToken(document.FilePath),
// After
FileUrl = AzureBlobPathProvider.ResolveBlobUrl(document.FilePath, string.Empty),
```

`AzureBlobPathProvider` is in the `Speccon.Tap.Services` namespace — add the using if not already present:
```csharp
using Speccon.Tap.Services;
```

**Status:** Planned, not yet implemented. Commit and push after making the change.

---

## Issue 4 — UpdateCustomer returning "Customer not found" (FRONTEND ISSUE — no backend action required)

### Symptom
After a document upload, the frontend fires:
```
PUT https://localhost:7128/api/Customer/UpdateCustomer?customerKey=aa0e5452-a861-4cfd-a537-19ddf2e27be9
```
Response: `{ "isError": true, "errorMessage": "Customer not found." }`

### Root Cause
The frontend is calling `UpdateCustomer` as a secondary step after upload, passing a `documentChecklist` field in the body that does not exist on `UpdateCustomerDto`. More critically, the `customerKey` being passed does not match any active record in the `CRMCustomer` table — the key appears to be from a different context (pipeline/prospect key).

`CustomerDocumentController.Upload` already handles all document persistence. The subsequent `UpdateCustomer` call is redundant and incorrect.

### Fix Required (Frontend)
The **frontend developer** must remove (or guard) the `UpdateCustomer` call that fires after a document upload in the Legal Documents section. No backend change is needed.

---

## Summary Table

| # | Issue | Status | Owner |
|---|---|---|---|
| 1 | 404 on upload — stale backend binary | Rebuild backend to fix | Backend developer |
| 2 | Package downgrade build error | Edit made, needs commit+push | Backend developer |
| 3 | FileUrl returns relative path not Azure URL | Code change pending | Backend developer |
| 4 | UpdateCustomer "Customer not found" after upload | Frontend bug, no backend change needed | Frontend developer |

---

## Document Storage Reference

Uploaded files are stored in the `Document` table and in Azure Blob Storage:

**SQL query to inspect uploads:**
```sql
SELECT
    d.DocumentId,
    d.DocumentKey,
    dt.DocumentTypeName,
    d.RecordKey AS CustomerKey,
    d.FileName,
    d.FilePath,
    d.CreatedDate,
    d.RecordStatusId
FROM Document d
INNER JOIN DocumentType dt ON d.DocumentTypeId = dt.DocumentTypeId
WHERE dt.DocumentGroupType = 2
ORDER BY d.CreatedDate DESC
```

**Blob path pattern:**
```
Uploads/CRM/CustomerDocuments/{customerKey}/{originalName}_{uuid}.{ext}
```

Container: `tap-file-repository` | Storage account: `devstoragetap`
