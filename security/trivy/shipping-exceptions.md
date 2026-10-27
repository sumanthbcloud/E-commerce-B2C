# Security Vulnerability Exception: Shipping Service

**Service**: `shipping`  
**Repository**: `sumanthbcloud/E-commerce-B2C`  
**Path**: `app/shipping`  
**Date**: October 27, 2026  
**Status**: Approved Scoped Exception  
**Exception File**: `security/trivy/shipping.trivyignore`  

---

## Executive Summary

Following the migration of the Shipping service to Java 17, Spring Boot 3.5.16, Tomcat 10.1.59, and Jackson 2.21.7, 65 of 67 original vulnerabilities (97.0%) were remediated. The remaining two vulnerabilities are reported by Trivy against `org.springframework:spring-webmvc:6.2.19`.

Detailed source-level applicability assessment confirms that neither vulnerable feature is utilized by the Shipping service. These findings are classified as:

> **"Dependency present, vulnerable functionality not used by the current Shipping implementation."**

To maintain a strict security posture while avoiding premature or breaking framework upgrades to Spring Framework 7 / Spring Boot 4, a narrowly scoped, documented exception is established specifically for the Shipping service. The centralized CI/CD security gate remains fully active (`exit-code: 1`, `severity: CRITICAL,HIGH`), and all other vulnerabilities will continue to block builds.

---

## Documented Exceptions

### 1. CVE-2026-47884

- **CVE ID**: `CVE-2026-47884`
- **Affected Dependency**: `org.springframework:spring-webmvc`
- **Detected Version**: `6.2.19`
- **Severity**: `CRITICAL`
- **Why Trivy Detects It**: Trivy inspects dependencies bundled inside `opt/shipping/shipping.jar`. `spring-webmvc:6.2.19` is present transitively via `spring-boot-starter-web:3.5.16`. Trivy cross-references known vulnerability databases and flags CVE-2026-47884, indicating a fix is available in version `7.0.9`.
- **Applicability Assessment**: **Not applicable based on current Shipping implementation**.
  - The vulnerability involves Remote Code Execution (RCE) via improper path limitation during XSL template stylesheet resolution in Spring MVC's `XsltView` component when processing view names or template locations.
- **Exact Repository Evidence**:
  - **Controller Architecture**: Shipping defines all HTTP endpoints in a single controller class (`com.instana.robotshop.shipping.Controller`) annotated with `@RestController`. Under Spring MVC, `@RestController` implies `@ResponseBody` on all handler methods, ensuring return values are serialized directly into HTTP response bodies via Jackson rather than dispatched to a `ViewResolver`.
  - **No XsltView / ViewResolver**: A comprehensive codebase search across `app/shipping/src/` confirms zero occurrences of `XsltView`, `XSLT`, `XSL`, `TransformerFactory`, `ViewResolver`, `ModelAndView`, or any view-rendering abstractions.
  - **No Stylesheet Resources**: There are zero `.xsl`, `.xslt`, or template resource files located under `src/main/resources` or anywhere within the repository.
- **Current Disposition**: Exception approved for Shipping service via `security/trivy/shipping.trivyignore`.
- **Review Triggers**:
  - Shipping begins using Spring MVC view rendering or view resolvers.
  - XSLT processing or `XsltView` is introduced into the Shipping service.
  - Spring Framework publishes a compatible patched release in the 6.2.x line.
  - Spring Boot publishes an updated release/BOM containing a patched Spring Framework version.

---

### 2. CVE-2026-47890

- **CVE ID**: `CVE-2026-47890`
- **Affected Dependency**: `org.springframework:spring-webmvc`
- **Detected Version**: `6.2.19`
- **Severity**: `CRITICAL`
- **Why Trivy Detects It**: Trivy inspects `shipping.jar` and detects `spring-webmvc:6.2.19` bundled as part of `spring-boot-starter-web`. Trivy matches the package version against known vulnerability advisories for stream corruption in Server-Sent Events (SSE).
- **Applicability Assessment**: **Not applicable based on current Shipping implementation**.
  - The vulnerability involves stream corruption occurring when Server-Sent Events (SSE) responses are combined with view-based rendering pipelines.
- **Exact Repository Evidence**:
  - **No SSE Components**: Code search across `app/shipping/src/` confirms zero usage of `SseEmitter`, `ResponseBodyEmitter`, `text/event-stream`, or asynchronous streaming endpoints.
  - **Synchronous REST Only**: All 9 endpoints exposed by Shipping (`/memory`, `/free`, `/health`, `/count`, `/codes`, `/cities/{code}`, `/match/{code}/{text}`, `/calc/{id}`, `/confirm/{id}`) execute as synchronous, discrete HTTP request-response handlers returning standard Java objects or primitive types serialized to JSON/plain text.
- **Current Disposition**: Exception approved for Shipping service via `security/trivy/shipping.trivyignore`.
- **Review Triggers**:
  - Server-Sent Events (`SseEmitter`, `text/event-stream`) or streaming endpoints are introduced into Shipping.
  - View-based rendering is coupled with streaming responses.
  - Spring Framework publishes a compatible patched release addressing the CVE.
  - Spring Boot publishes an updated release/BOM containing a patched Spring Framework version.

---

## Governance and Scope Verification

1. **Scoped Specifically to Shipping**: The exception file `security/trivy/shipping.trivyignore` is explicitly passed by `.github/workflows/ci-shipping.yml` into the centralized reusable workflow. It does not affect other services (e.g. `user`, `cart`, `payment`).
2. **Blocking Gate Maintained**: The reusable workflow retains `exit-code: "1"` and `severity: CRITICAL,HIGH`.
3. **No Blanket Ignores**: Only `CVE-2026-47884` and `CVE-2026-47890` are excepted. Any other HIGH or CRITICAL vulnerability will immediately fail the build.
