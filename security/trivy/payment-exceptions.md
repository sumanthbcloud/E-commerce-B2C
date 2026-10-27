# Security Vulnerability Exception: Payment Service

**Service**: `payment`  
**Repository**: `sumanthbcloud/E-commerce-B2C`  
**Path**: `app/payment`  
**Date**: October 27, 2026  
**Status**: Approved Scoped Exception  
**Exception File**: `security/trivy/payment.trivyignore`  
**Runtime Image**: `python:3.12-slim-bookworm` (Debian 12.15 Bookworm)  

---

## Executive Summary

Following the modernization of the Payment service to Python 3.12 (`python:3.12-slim-bookworm`), all 7 original Python package findings were naturally resolved (0 Python package vulnerabilities remaining). The remaining 61 scanner findings reported by Trivy reside exclusively in unpatched Debian 12 (Bookworm) base OS packages, for which Debian currently provides no patched releases.

Detailed runtime and repository applicability assessment determined that these 61 findings collapse into **15 unique CVEs**. None of the vulnerable code paths, utilities, or subsystems are loaded, executed, or reachable by the Payment service. These findings are classified as:

> **"Debian base OS package present, vulnerable functionality not applicable to the current Payment implementation."**

To maintain a strict security posture without weakening the centralized CI/CD security gate (`exit-code: 1`, `severity: CRITICAL,HIGH`, `ignore-unfixed: false`), a narrowly scoped exception is documented specifically for Payment.

---

## Documented Exceptions

### 1. CVE-2023-45853

- **CVE ID**: `CVE-2023-45853`
- **Affected Package / Functionality**: `zlib1g` (`1:1.2.13.dfsg-1`) — Integer overflow and resultant heap buffer overflow in `zipOpenNewFileInZip4_6` in MiniZip (`contrib/minizip/zip.c`).
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Binary inspection of `/lib/aarch64-linux-gnu/libz.so.1.2.13` confirms that `zipOpenNewFileInZip4_6` is not compiled or exported in Debian's `zlib1g` package. Debian packages core zlib functions only; Debian security tracker marks this CVE as `will_not_fix` because the vulnerable MiniZip file is not shipped in `zlib1g`.
  - Payment is a stateless REST microservice processing JSON requests and publishing AMQP events. It does not create, write, or compress ZIP archives.
- **Review Trigger**: Payment introduces ZIP archive creation/compression, or Debian publishes a patched `zlib1g` package.

---

### 2. CVE-2025-7458

- **CVE ID**: `CVE-2025-7458`
- **Affected Package / Functionality**: `libsqlite3-0` (`3.40.1-2+deb12u2`) — Integer overflow in SQLite core query execution engine when parsing malformed database schemas.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Process memory maps (`/proc/self/maps`) verify `libsqlite3.so` is not mapped. `sqlite3` and `_sqlite3` are absent from Python's `sys.modules`.
  - No `sqlite3` CLI binary exists in the container image.
  - Payment source (`payment.py`, `rabbitmq.py`) does not import `sqlite3`, contains no SQL queries, and opens no database files.
- **Review Trigger**: Payment introduces SQLite database connections, or Debian publishes a patched `libsqlite3-0` package.

---

### 3. CVE-2025-69720

- **CVE ID**: `CVE-2025-69720`
- **Affected Package / Functionality**: `libncursesw6`, `libtinfo6`, `ncurses-base`, `ncurses-bin` (`6.4-4`) — Buffer overflow in ncurses terminal display handling functions when parsing crafted terminfo capabilities or terminal escape sequences.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - `libncurses` and `libtinfo` are not loaded into memory by uWSGI or Python.
  - Payment operates as a headless HTTP daemon listening on port 8080 and writes plain-text logs to standard output via Python `logging.StreamHandler`. It does not perform interactive curses terminal rendering.
- **Review Trigger**: Payment incorporates ncurses/terminfo terminal UI libraries, or Debian publishes patched ncurses packages.

---

### 4. CVE-2026-11822

- **CVE ID**: `CVE-2026-11822`
- **Affected Package / Functionality**: `libsqlite3-0` (`3.40.1-2+deb12u2`) — Arbitrary code execution in SQLite via crafted full-text search (FTS5) queries or index data.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - SQLite is not imported, loaded in memory, or executed by Payment in any capacity.
- **Review Trigger**: Payment utilizes SQLite or FTS5 indices, or Debian publishes a patched `libsqlite3-0` package.

---

### 5. CVE-2026-11824

- **CVE ID**: `CVE-2026-11824`
- **Affected Package / Functionality**: `libsqlite3-0` (`3.40.1-2+deb12u2`) — Arbitrary code execution and crash in SQLite via malformed query plans and corrupted schemas.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - SQLite is not imported, loaded in memory, or executed by Payment in any capacity.
- **Review Trigger**: Payment utilizes SQLite, or Debian publishes a patched `libsqlite3-0` package.

---

### 6. CVE-2026-16742

- **CVE ID**: `CVE-2026-16742`
- **Affected Package / Functionality**: `libsystemd0`, `libudev1` (`252.39-1~deb12u2`) — Local privilege escalation in `systemd-homed` via missing signature verification on user home records.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - `systemd` is not PID 1; the `systemd-homed` daemon is not installed or running.
  - Process memory maps verify neither `libsystemd0` nor `libudev1` is loaded into uWSGI or Python.
- **Review Trigger**: Systemd is introduced as container init, or Debian publishes patched systemd packages.

---

### 7. CVE-2026-41992

- **CVE ID**: `CVE-2026-41992`
- **Affected Package / Functionality**: `gzip` (`1.12-1`) — Global buffer overflow and information disclosure in the `gzip` CLI utility during LZH decompression (`unpack.c`).
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Codebase analysis confirms zero subprocess or shell invocations (`subprocess`, `os.system`, `os.popen`).
  - Payment receives and parses JSON payloads exclusively; it never invokes the `gzip` CLI utility or decompresses LZH archives.
- **Review Trigger**: Payment invokes the `gzip` utility or processes compressed archives, or Debian publishes a patched `gzip` package.

---

### 8. CVE-2026-53613

- **CVE ID**: `CVE-2026-53613`
- **Affected Package / Functionality**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`) — TOCTOU race condition in `mount(8)` binary via ancestor directory swap.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Container executes strictly as unprivileged user `appuser` (UID 10001) with zero effective Linux capabilities (`CapEff = 0000000000000000`).
  - Executing `mount` inside the container fails immediately with `mount: must be superuser to use mount`.
  - Payment contains 0 subprocess or shell invocations and never invokes `mount`.
- **Review Trigger**: Container is granted elevated capabilities or root privileges, or Debian publishes patched util-linux packages.

---

### 9. CVE-2026-53615

- **CVE ID**: `CVE-2026-53615`
- **Affected Package / Functionality**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`) — Integer overflow in util-linux DOS partition table parser when scanning malformed disk partitions.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Payment performs no disk partitioning, block device scanning, or filesystem formatting.
  - Utilities like `fdisk`, `cfdisk`, and `blkid` are never invoked.
- **Review Trigger**: Payment processes raw disk images or block devices, or Debian publishes patched util-linux packages.

---

### 10. CVE-2026-54369

- **CVE ID**: `CVE-2026-54369`
- **Affected Package / Functionality**: `libacl1` (`2.3.1-3`) — Symlink traversal privilege escalation in `libacl` when recursively setting POSIX extended ACLs.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - `libacl.so` is not linked to uWSGI or Python and is not loaded in memory.
  - Payment makes no calls to POSIX extended attributes or ACL modification tools.
- **Review Trigger**: Payment manipulates extended filesystem ACLs, or Debian publishes a patched `libacl1` package.

---

### 11. CVE-2026-76642

- **CVE ID**: `CVE-2026-76642`
- **Affected Package / Functionality**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`) — Execution of privileged X-mount post-hooks following external mount helper failure.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Payment executes as unprivileged UID 10001, has no mount helpers configured, and executes no mount commands.
- **Review Trigger**: Container privileges are modified to allow mount management, or Debian publishes patched util-linux packages.

---

### 12. CVE-2026-78408

- **CVE ID**: `CVE-2026-78408`
- **Affected Package / Functionality**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`) — `nsenter --join-cgroup` leaks root cgroup migration authority.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Running `nsenter` inside the container fails with `Operation not permitted`.
  - Payment makes 0 subprocess calls and does not perform namespace or cgroup management.
- **Review Trigger**: Container is granted `CAP_SYS_ADMIN`, or Debian publishes patched util-linux packages.

---

### 13. CVE-2026-78409

- **CVE ID**: `CVE-2026-78409`
- **Affected Package / Functionality**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`) — Intermediate symlink escape during `X-mount.subdir` path resolution.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Payment never mounts filesystems or processes `X-mount.subdir` mount options.
- **Review Trigger**: Container is granted mount privileges, or Debian publishes patched util-linux packages.

---

### 14. CVE-2026-78410

- **CVE ID**: `CVE-2026-78410`
- **Affected Package / Functionality**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`) — Race condition in `mount(8)` restricted bind mounts allowing unauthorized attribute changes.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Payment executes as UID 10001 with 0 capabilities; bind mounting is disallowed by the container runtime.
- **Review Trigger**: Container is granted mount privileges, or Debian publishes patched util-linux packages.

---

### 15. CVE-2026-9538

- **CVE ID**: `CVE-2026-9538`
- **Affected Package / Functionality**: `perl-base` (`5.36.0-7+deb12u4`) — Denial of service in Perl module `Archive::Tar` when extracting tar archives with malformed header fields.
- **Applicability Conclusion**: **Not applicable to current Payment implementation**.
- **Runtime / Repository Evidence**:
  - Payment is implemented entirely in Python running under uWSGI. Perl is never invoked (0 subprocess calls).
  - Payment accepts JSON payloads only and does not parse or extract tar archives.
- **Review Trigger**: Payment invokes Perl scripts or extracts tar archives, or Debian publishes a patched `perl-base` package.

---

## Governance and Scope Verification

1. **Scoped Specifically to Payment**: The exception file `security/trivy/payment.trivyignore` is explicitly passed by `.github/workflows/ci-payment.yml` into the centralized reusable workflow. It does not affect other services (`shipping`, `user`, `cart`, `catalogue`).
2. **Blocking Gate Maintained**: The reusable workflow retains `exit-code: "1"`, `severity: CRITICAL,HIGH`, and `ignore-unfixed: false`.
3. **No Blanket Ignores**: Exactly these 15 verified CVEs are excepted. Any other HIGH or CRITICAL vulnerability (including any future Python package vulnerability) will immediately block CI/CD.
