# Security Vulnerability Exception: Ratings Service

**Service**: `ratings`  
**Repository**: `sumanthbcloud/E-commerce-B2C`  
**Path**: `app/ratings`  
**Date**: October 27, 2026  
**Status**: Approved Scoped Exception  
**Exception File**: `security/trivy/ratings.trivyignore`  
**Runtime Image**: `php:8.2-apache-bookworm` (Debian 12.15 Bookworm / PHP 8.2.35 / Apache 2.4.68)  

---

## Executive Summary

Following runtime modernization of the Ratings service to PHP 8.2 (`php:8.2-apache-bookworm`) and Symfony 6.4 LTS, zero vulnerabilities exist in Composer/PHP application dependencies.

In the container image, build-time dependencies (`$PHPIZE_DEPS`, `libc6-dev`, `linux-libc-dev`, `libzip-dev`, `zlib1g-dev`) were removed from the final runtime image, reducing 197 vulnerabilities. Furthermore, four fixable vulnerabilities (`CVE-2025-59375`, `CVE-2026-77214`, `CVE-2026-84782`, `CVE-2026-111497`) were remediated in the runtime layer via targeted Debian Bookworm package updates (`libexpat1`, `libssl3`, `openssl`, `libbrotli1`).

The remaining 110 scanner findings reported by Trivy collapse into **35 unique CVEs** residing in Debian base OS packages for which Debian currently provides no patched releases. Detailed runtime and repository applicability assessment determined that none of the vulnerable code paths, utilities, or subsystems are loaded, executed, or reachable by the Ratings service. These findings are classified as:

> **"Debian base OS package present, vulnerable functionality not applicable to the current Ratings implementation."**

To maintain a strict security posture without weakening the centralized CI/CD security gate (`exit-code: 1`, `severity: CRITICAL,HIGH`, `ignore-unfixed: false`), a narrowly scoped exception is documented specifically for Ratings.

---

## Documented Exceptions

### 1. zlib1g (1 Unique CVE)

#### CVE-2023-45853
- **Severity**: `CRITICAL`
- **Affected Package**: `zlib1g` (`1:1.2.13.dfsg-1`)
- **Vulnerability**: Integer overflow and resultant heap buffer overflow in `zipOpenNewFileInZip4_6` in MiniZip contrib code (`contrib/minizip/zip.c`).
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Binary inspection of `/lib/aarch64-linux-gnu/libz.so.1` verifies `zipOpenNewFile` is absent. In Debian, `zlib1g` ships only the core zlib deflate/inflate library; MiniZip is an uninstalled optional package (`libminizip1`). Debian security tracker classifies this CVE as `will_not_fix` for `zlib1g`.
- **Review Trigger**: Ratings introduces ZIP creation using MiniZip, or Debian publishes an updated `zlib1g` package.

---

### 2. SQLite Core & Extensions (3 Unique CVEs)

#### CVE-2025-7458
- **Severity**: `CRITICAL`
- **Affected Package**: `libsqlite3-0` (`3.40.1-2+deb12u2`)
- **Vulnerability**: Integer overflow in SQLite query execution engine when parsing malformed schemas.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings persists all data in MySQL via `pdo_mysql` (`PDO_URL`, `PDO_USER`, `PDO_PASSWORD`). Ratings does not create, open, or query SQLite database files.
- **Review Trigger**: Ratings introduces SQLite storage, or Debian publishes a patched `libsqlite3-0` package.

#### CVE-2026-11822
- **Severity**: `HIGH`
- **Affected Package**: `libsqlite3-0` (`3.40.1-2+deb12u2`)
- **Vulnerability**: Arbitrary code execution via crafted FTS5 full-text search data.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings does not use the SQLite FTS5 extension or query SQLite databases.
- **Review Trigger**: Ratings adopts SQLite FTS5 search indexing.

#### CVE-2026-11824
- **Severity**: `HIGH`
- **Affected Package**: `libsqlite3-0` (`3.40.1-2+deb12u2`)
- **Vulnerability**: Heap-based buffer overflow in SQLite FTS5 extension.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings does not use SQLite FTS5 extension.
- **Review Trigger**: Ratings adopts SQLite FTS5 search indexing.

---

### 3. libxml2 XML Parser (7 Unique CVEs)

#### CVE-2026-6653
- **Severity**: `CRITICAL`
- **Affected Package**: `libxml2` (`2.9.14+dfsg-1.3~deb12u3`)
- **Vulnerability**: Denial of Service via crafted XML input due to use-after-free during entity substitution.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings is a pure REST JSON API (`JsonResponse` for `/_health`, `/api/rate/...`, and `/api/fetch/...`). No XML request endpoints exist and no XML parsing is performed. Apache `mod_xml2enc` is not loaded.
- **Review Trigger**: Ratings introduces XML parsing endpoints or accepts XML request bodies.

#### CVE-2026-74860
- **Severity**: `HIGH`
- **Affected Package**: `libxml2`
- **Vulnerability**: Double-free / use-after-free in libxml2 Python bindings.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings is a PHP application; Python bindings for libxml2 are not installed or executed.
- **Review Trigger**: Python execution is introduced into the container.

#### CVE-2026-86138, CVE-2026-86140, CVE-2026-86142, CVE-2026-86143, CVE-2026-86144
- **Severity**: `HIGH`
- **Affected Package**: `libxml2`
- **Vulnerabilities**: Heap buffer overflow in XML entity parsing (86138), stack buffer overflow in `xmlSnprintfElements` (86140), heap overflow in `xmlXPtrEval` xpointer length evaluation (86142), integer overflow in write callbacks (86143), improper parseFlags propagation during entity expansion (86144).
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings codebase contains zero XML parsing calls, XPath/XPointer evaluations, or XML formatting operations.
- **Review Trigger**: Ratings introduces XML parsing or transformation capabilities.

---

### 4. Apache HTTP Server (7 Unique CVEs)

#### CVE-2026-46729
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils` (`2.4.68-1~deb12u1`)
- **Vulnerability**: NULL pointer dereference Denial of Service in `mod_heartmonitor`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Module audit via `apache2ctl -M` confirms `mod_heartmonitor` is disabled and not loaded.
- **Review Trigger**: `mod_heartmonitor` is enabled in Apache configuration.

#### CVE-2026-56153
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils`
- **Vulnerability**: Heap buffer overflow in `mod_charset_lite`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: `mod_charset_lite` is disabled and not loaded.
- **Review Trigger**: `mod_charset_lite` is enabled.

#### CVE-2026-56154
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils`
- **Vulnerability**: Use-after-free in `mod_rewrite` when using lookahead evaluation syntax (`%{LA-U:HTTP:...}`).
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: `mod_rewrite` is enabled for Symfony front controller routing (`.htaccess`). Inspection of `app/ratings/html/.htaccess` confirms rewrite rules use standard environment checks and target redirection (`RewriteRule ^ %{ENV:BASE}/index.php [L]`); lookahead syntax (`%{LA-U:...}` or `%{LA-F:...}`) is completely absent.
- **Review Trigger**: Lookahead variable rewrite rules are added to `.htaccess` or Apache configuration.

#### CVE-2026-63292
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils`
- **Vulnerability**: Buffer overflow via oversized Host header in `mod_vhost_alias`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: `mod_vhost_alias` is disabled and not loaded.
- **Review Trigger**: `mod_vhost_alias` is enabled.

#### CVE-2026-63686
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils`
- **Vulnerability**: Charset conversion failure crash in `mod_xml2enc`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: `mod_xml2enc` is disabled and not loaded.
- **Review Trigger**: `mod_xml2enc` is enabled.

#### CVE-2026-63718
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils`
- **Vulnerability**: HTTP response smuggling in `mod_proxy_uwsgi`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: `mod_proxy` and `mod_proxy_uwsgi` are disabled and not loaded (Ratings uses `mod_php`, not uWSGI/FPM).
- **Review Trigger**: Apache proxy modules are enabled.

#### CVE-2026-73636
- **Severity**: `HIGH`
- **Affected Package**: `apache2`, `apache2-bin`, `apache2-data`, `apache2-utils`
- **Vulnerability**: Digest authentication credential replay in `mod_auth_digest`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: `mod_auth_digest` is disabled and not loaded.
- **Review Trigger**: HTTP Digest authentication is enabled.

---

### 5. cURL & libcurl4 (5 Unique CVEs)

#### CVE-2026-12064
- **Severity**: `HIGH`
- **Affected Package**: `curl`, `libcurl4` (`7.88.1-10+deb12u14`)
- **Vulnerability**: SSH host verification bypass when using schemeless URLs with SFTP/SCP.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings cURL usage (`CatalogueService::checkSKU`) is strictly HTTP to `catalogue:8080`. SFTP and SCP protocols are never invoked.
- **Review Trigger**: SFTP or SCP URLs are used with cURL.

#### CVE-2026-6276
- **Severity**: `HIGH`
- **Affected Package**: `curl`, `libcurl4`
- **Vulnerability**: Cookie leak when reusing connections with custom Host headers.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings does not set custom Host headers or manage cookies in cURL requests.
- **Review Trigger**: Custom Host headers or cookie jars are configured.

#### CVE-2026-8286
- **Severity**: `HIGH`
- **Affected Package**: `curl`, `libcurl4`
- **Vulnerability**: Insecure connection establishment due to TLS configuration mismatch on shared connections.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings cURL connects over plain HTTP (`http://catalogue:8080`), not HTTPS/TLS.
- **Review Trigger**: HTTPS connections with custom TLS options are introduced.

#### CVE-2026-8458
- **Severity**: `HIGH`
- **Affected Package**: `curl`, `libcurl4`
- **Vulnerability**: Unauthorized connection reuse due to logical error in connection caching.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings invokes `curl_close($curl)` immediately after each request execution, preventing handle or connection reuse across calls.
- **Review Trigger**: Persistent cURL connection pooling is enabled.

#### CVE-2026-8927
- **Severity**: `HIGH`
- **Affected Package**: `curl`, `libcurl4`
- **Vulnerability**: Information disclosure due to uncleared proxy authentication state.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings cURL communicates directly over internal Kubernetes DNS without forward or HTTP proxies.
- **Review Trigger**: Outbound proxy configuration is added.

---

### 6. Linux System & Kernel Utilities (6 Unique CVEs)

#### CVE-2026-53613, CVE-2026-53615, CVE-2026-76642, CVE-2026-78408, CVE-2026-78409, CVE-2026-78410
- **Severity**: `HIGH`
- **Affected Package**: `bsdutils`, `libblkid1`, `libmount1`, `libsmartcols1`, `libuuid1`, `mount`, `util-linux`, `util-linux-extra` (`2.38.1-5+deb12u3`)
- **Vulnerabilities**: TOCTOU target swap in `mount` (53613), DOS partition parser integer overflow (53615), privileged X-mount post-hook execution (76642), `nsenter --join-cgroup` root authority leak (78408), `X-mount.subdir` detached-tree symlink escape (78409), restricted bind mount redirection (78410).
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: The container executes strictly under unprivileged UID 33 (`www-data`) without `CAP_SYS_ADMIN` capability. `mount`, `umount`, and `nsenter` fail with `Operation not permitted`. No raw disk or partition parsing is performed.
- **Review Trigger**: Container is granted elevated privileges or `CAP_SYS_ADMIN`.

---

### 7. Remaining Base OS Utilities (6 Unique CVEs)

#### CVE-2025-69720
- **Severity**: `HIGH`
- **Affected Package**: `libncursesw6`, `libtinfo6`, `ncurses-base`, `ncurses-bin` (`6.4-4`)
- **Vulnerability**: Buffer overflow parsing malformed terminfo entries.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings executes as a headless background daemon (`apache2-foreground`) without interactive TTY or curses terminal display libraries.
- **Review Trigger**: Interactive terminal UI utilities are executed in the container.

#### CVE-2026-16742
- **Severity**: `HIGH`
- **Affected Package**: `libsystemd0`, `libudev1` (`252.39-1~deb12u1`)
- **Vulnerability**: Local privilege escalation via missing home-record signature verification in `systemd-homed`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: PID 1 is `apache2-foreground`; `systemd` and `systemd-homed` daemons are not running in the container.
- **Review Trigger**: Systemd is configured as container init.

#### CVE-2026-9538
- **Severity**: `HIGH`
- **Affected Package**: `libperl5.36`, `perl`, `perl-base`, `perl-modules-5.36` (`5.36.0-7+deb12u3`)
- **Vulnerability**: `Archive::Tar` Denial of Service via crafted tar header with large entry size.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings is a PHP service; Perl interpreter and `Archive::Tar` are never invoked during application lifecycle.
- **Review Trigger**: Perl scripts or Tar archive processing are introduced.

#### CVE-2026-41992
- **Severity**: `HIGH`
- **Affected Package**: `gzip` (`1.12-1`)
- **Vulnerability**: Global buffer overflow in LZH decompression.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Apache uses `mod_deflate` (built on `zlib`) for HTTP compression. The standalone `gzip` CLI binary and LZH decompression routines are never invoked.
- **Review Trigger**: LZH decompression or standalone `gzip` CLI execution is introduced.

#### CVE-2026-54369
- **Severity**: `HIGH`
- **Affected Package**: `libacl1` (`2.3.1-3`)
- **Vulnerability**: Symlink traversal privilege escalation in libacl functions.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings executes as unprivileged UID 33 (`www-data`) and does not invoke POSIX ACL management APIs or execute `setfacl`.
- **Review Trigger**: POSIX ACL manipulation functions are introduced.

#### CVE-2023-2953
- **Severity**: `HIGH`
- **Affected Package**: `libldap-2.5-0` (`2.5.13+dfsg-5`)
- **Vulnerability**: NULL pointer dereference in `ber_memalloc_x`.
- **Applicability Conclusion**: Not applicable to current Ratings implementation.
- **Runtime Evidence**: Ratings does not connect to LDAP directory services or enable Apache LDAP authentication modules.
- **Review Trigger**: LDAP connectivity is introduced.
