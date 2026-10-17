/* ==========================================================================
   Mini-SOC · demo-data.js — central sample-data layer (PART 1 of 2)
   --------------------------------------------------------------------------
   EVERY record in this file is SAMPLE / DEMO data. Nothing here is produced
   by a live sensor, and no backend is contacted.

   Layout:
     SOC.demo.env        environment banner values + demo clock
     SOC.demo.actors     demo people / service principals
     SOC.demo.assets     monitored asset inventory (sample)
     SOC.demo.techniques MITRE ATT&CK technique references used by the UI
     SOC.demo.events     security events (recent, detailed records)
     SOC.demo.incidents  incidents + timeline + evidence + notes
     SOC.demo.*          (aggregates, activity, notifications)

   Backend integration point:
     Replace this module with a fetch() wrapper that returns the SAME shapes.
     Nothing else in the UI reads hard-coded records — it all goes through
     SOC.services (see js/services.js).
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};

  function t(iso) {
    return Date.parse(iso);
  }

  var NOW = t("2026-10-09T15:40:00");

  /* ---- Actors ---------------------------------------------------------- */
  var actors = [
    { id: "u-mreyes", name: "M. Reyes", role: "Financial analyst", dept: "Finance" },
    { id: "u-jchen", name: "J. Chen", role: "Support engineer", dept: "Support" },
    { id: "u-atorres", name: "A. Torres", role: "Product designer", dept: "Product" },
    { id: "u-svc-backup", name: "svc-backup", role: "Service account", dept: "IT operations" },
    { id: "u-unknown", name: "Unattributed principal", role: "Unknown", dept: "—" }
  ];

  /* ---- Assets ---------------------------------------------------------- */
  var assets = [
    { id: "EP-WIN-042", name: "EP-WIN-042", type: "Endpoint", os: "Windows 11", zone: "Corporate LAN", ip: "10.20.4.42", owner: "u-mreyes", risk: "critical", status: "Compromised", note: "Primary affected workstation" },
    { id: "EP-WIN-017", name: "EP-WIN-017", type: "Endpoint", os: "Windows 10", zone: "Corporate LAN", ip: "10.20.4.17", owner: "u-jchen", risk: "medium", status: "Monitored", note: "Malware quarantined 08 Oct" },
    { id: "EP-MAC-003", name: "EP-MAC-003", type: "Endpoint", os: "macOS 15", zone: "Corporate LAN", ip: "10.20.5.3", owner: "u-atorres", risk: "medium", status: "Monitored", note: "Periodic DNS beacon observed" },
    { id: "SRV-WEB-01", name: "SRV-WEB-01", type: "Server", os: "Ubuntu 22.04", zone: "DMZ", ip: "10.20.8.10", owner: "u-svc-backup", risk: "high", status: "At risk", note: "Management port reachable" },
    { id: "SRV-DB-02", name: "SRV-DB-02", type: "Server", os: "Windows Server 2019", zone: "Core", ip: "10.20.8.32", owner: "u-svc-backup", risk: "critical", status: "Compromised", note: "Shadow copies deleted" },
    { id: "SRV-FILE-01", name: "SRV-FILE-01", type: "Server", os: "Windows Server 2022", zone: "Core", ip: "10.20.8.51", owner: "u-svc-backup", risk: "high", status: "Compromised", note: "Staging archive detected" },
    { id: "SRV-AD-01", name: "SRV-AD-01", type: "Server", os: "Windows Server 2019", zone: "Core", ip: "10.20.8.5", owner: "u-svc-backup", risk: "high", status: "Monitored", note: "Domain controller" },
    { id: "IDP-SSO-01", name: "IDP-SSO-01", type: "Server", os: "Linux (SSO)", zone: "DMZ", ip: "10.20.8.20", owner: "u-svc-backup", risk: "high", status: "Monitored", note: "SSO portal · brute-force target" },
    { id: "DECOY-FILESVR", name: "DECOY-FILESVR", type: "Decoy", os: "Windows Server 2019", zone: "Corporate LAN", ip: "10.20.9.40", owner: "—", risk: "high", status: "Triggered", note: "Simulated bait file share" },
    { id: "DECOY-AD-TEMP", name: "DECOY-AD-TEMP", type: "Decoy", os: "Directory object", zone: "Core", ip: "—", owner: "—", risk: "medium", status: "Armed", note: "Simulated bait account" },
    { id: "DECOY-DB-LEGACY", name: "DECOY-DB-LEGACY", type: "Decoy", os: "Windows Server 2012", zone: "Core", ip: "10.20.9.52", owner: "—", risk: "medium", status: "Armed", note: "Simulated legacy SQL honeypot" },
    { id: "BAIT-Q3FORECAST", name: "BAIT-Q3FORECAST.xlsx", type: "Decoy", os: "Document", zone: "Corporate LAN", ip: "—", owner: "—", risk: "high", status: "Triggered", note: "Simulated bait document" },
    { id: "HONEYPOT-SSH-01", name: "HONEYPOT-SSH-01", type: "Decoy", os: "Alpine Linux", zone: "DMZ", ip: "10.20.8.90", owner: "—", risk: "medium", status: "Armed", note: "Simulated internet-facing SSH honeypot" }
  ];

  /* ---- MITRE ATT&CK references ---------------------------------------- */
  var techniques = [
    { id: "T1110", name: "Brute Force", tactic: "Credential Access" },
    { id: "T1110.003", name: "Password Spraying", tactic: "Credential Access" },
    { id: "T1110.004", name: "Credential Stuffing", tactic: "Credential Access" },
    { id: "T1078", name: "Valid Accounts", tactic: "Persistence" },
    { id: "T1059.001", name: "PowerShell", tactic: "Execution" },
    { id: "T1218.011", name: "Rundll32", tactic: "Defense Evasion" },
    { id: "T1003", name: "OS Credential Dumping", tactic: "Credential Access" },
    { id: "T1021.002", name: "Remote Services: SMB/Windows Admin Shares", tactic: "Lateral Movement" },
    { id: "T1071.001", name: "Application Layer Protocol: Web Protocols", tactic: "Command and Control" },
    { id: "T1071.004", name: "Application Layer Protocol: DNS", tactic: "Command and Control" },
    { id: "T1074", name: "Data Staged", tactic: "Collection" },
    { id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact" },
    { id: "T1490", name: "Inhibit System Recovery", tactic: "Impact" },
    { id: "T1046", name: "Network Service Discovery", tactic: "Discovery" },
    { id: "T1087.002", name: "Account Discovery: Domain Account", tactic: "Discovery" },
    { id: "T1558.003", name: "Kerberoasting", tactic: "Credential Access" },
    { id: "T1566.002", name: "Phishing: Spearphishing Link", tactic: "Initial Access" }
  ];

  /* ---- Security events --------------------------------------------------
     Column order:
     [id, ts, asset, type, source, severity, status, title, detail, incident, technique, evidence]
     ---------------------------------------------------------------------- */
  var EVENT_ROWS = [
    ["EVT-9124", "2026-10-09T14:48:00", "SRV-DB-02", "Process", "EDR", "Critical", "New", "Volume shadow copy deletion attempted", "vssadmin.exe delete shadows /all invoked by an unusual parent process", "INC-2026-1039", "T1490", "process=vssadmin.exe args=\"delete shadows /all\" parent=powershell.exe user=NT AUTHORITY\\SYSTEM"],
    ["EVT-9123", "2026-10-09T14:44:00", "SRV-FILE-01", "Malware", "EDR", "Critical", "New", "Encryptor binary written to disk", "Newly observed unsigned binary upd_service.exe written to a administrative share", "INC-2026-1039", "T1486", "path=C:\\Windows\\Temp\\upd_service.exe sha256=3f9a…c71d signer=none verdict=malicious"],
    ["EVT-9122", "2026-10-09T14:31:00", "SRV-FILE-01", "File", "EDR", "High", "Investigating", "Large archive created outside backup window", "2.4 GB 7z archive written by an interactive logon rather than the backup service", "INC-2026-1039", "T1074", "path=C:\\ProgramData\\stage.7z size=2.4GB user=CORP\\svc-backup process=7z.exe"],
    ["EVT-9121", "2026-10-09T14:22:00", "SRV-DB-02", "Network", "Network Sensor", "Critical", "Investigating", "Outbound HTTPS session to known C2 infrastructure", "Repeated 60-second TLS sessions to 185.220.101.14 from the database server", "INC-2026-1039", "T1071.001", "src=10.20.8.32 dst=185.220.101.14:443 bytes_out=184KB interval≈60s sni=cdn-static[.]live"],
    ["EVT-9120", "2026-10-09T14:17:00", "EP-WIN-042", "Process", "EDR", "Critical", "Investigating", "Credential dumping tool accessed LSASS", "Unsigned process opened a handle to lsass.exe with VM_READ rights", "INC-2026-1039", "T1003", "target=lsass.exe access=0x1010 actor=C:\\Users\\m.reyes\\AppData\\Roaming\\svhost.exe"],
    ["EVT-9119", "2026-10-09T14:12:00", "EP-WIN-042", "Network", "Network Sensor", "High", "Investigating", "SMB session to database server from workstation", "Workstation opened an admin share on SRV-DB-02 using its own logon session", "INC-2026-1039", "T1021.002", "src=10.20.4.42 dst=10.20.8.32 share=C$ auth=NTLM user=CORP\\m.reyes"],
    ["EVT-9118", "2026-10-09T14:05:00", "EP-WIN-042", "Process", "EDR", "High", "Investigating", "PowerShell launched with encoded command window hidden", "powershell.exe -w hidden -enc spawned three levels below an Office process", "INC-2026-1035", "T1059.001", "cmd=powershell.exe -w hidden -enc SQBmACgA… parent=WINWORD.EXE"],
    ["EVT-9117", "2026-10-09T13:58:00", "SRV-WEB-01", "Network", "Network Sensor", "High", "Acknowledged", "Repeated HTTPS authentication failures on SSO portal", "268 failed logins attributed to u-jchen in a four-minute window", "INC-2026-1042", "T1110.004", "host=idp-sso-01 status=401 count=268 window=4m user=j.chen"],
    ["EVT-9116", "2026-10-09T13:52:00", "IDP-SSO-01", "Authentication", "Identity Provider", "Critical", "Investigating", "Successful sign-in from previously unseen network", "First successful authentication for u-jchen from ASN 204745 after a credential-stuffing burst", "INC-2026-1042", "T1078", "user=j.chen ip=45.155.205.233 asn=204745 country=PL mfa=not-challenged device=new"],
    ["EVT-9115", "2026-10-09T13:49:00", "IDP-SSO-01", "Authentication", "Identity Provider", "Critical", "Investigating", "Credential stuffing burst against SSO portal", "412 failed logins in six minutes from a single rotating source", "INC-2026-1042", "T1110.004", "host=idp-sso-01 source=45.155.205.233 failures=412 window=6m user_agents=rotating"],
    ["EVT-9114", "2026-10-09T13:44:00", "EP-WIN-042", "Process", "EDR", "Medium", "Acknowledged", "Office application spawned an interactive shell", "WINWORD.EXE started powershell.exe with no user interaction recorded", "INC-2026-1035", "T1059.001", "parent=WINWORD.EXE child=powershell.exe user=corp\\m.reyes"],
    ["EVT-9113", "2026-10-09T13:38:00", "EP-WIN-042", "Authentication", "Identity Provider", "Medium", "New", "MFA push fatigue pattern for finance user", "Nine push prompts in three minutes, one eventually approved", "INC-2026-1042", "T1110", "user=m.reyes pushes=9 approved=1 window=3m"],
    ["EVT-9112", "2026-10-09T12:20:00", "EP-MAC-003", "DNS", "Network Sensor", "Medium", "Acknowledged", "Periodic DNS queries to a rare domain", "Sixty-second beacon cadence to sync-update[.]cloud, first observed 07 Oct", "INC-2026-1024", "T1071.004", "src=10.20.5.3 qname=api.sync-update[.]cloud interval=60s first_seen=07 Oct 2026"],
    ["EVT-9111", "2026-10-09T11:55:00", "EP-MAC-003", "Policy", "EDR", "Low", "Resolved", "Removable storage blocked", "USB mass-storage write blocked by endpoint policy", "", "", "device=USB policy=removable-storage-block user=a.torres"],
    ["EVT-9110", "2026-10-09T11:31:00", "DECOY-FILESVR", "Deception", "Deception Platform", "High", "Investigating", "Decoy file share accessed", "Simulated bait share \\DECOY-FILESVR\\payroll read by the svc-backup token", "INC-2026-1019", "T1078", "share=\\\\DECOY-FILESVR\\payroll actor=10.20.4.42 account=CORP\\svc-backup reads=14"],
    ["EVT-9109", "2026-10-09T11:27:00", "BAIT-Q3FORECAST", "Deception", "Deception Platform", "High", "Investigating", "Bait document opened", "Q3-forecast.xlsx beaconed back to the deception platform on open", "INC-2026-1019", "T1078", "document=Q3-forecast.xlsx host=EP-WIN-042 account=CORP\\svc-backup"],
    ["EVT-9108", "2026-10-09T11:12:00", "EP-WIN-042", "Identity", "EDR", "High", "Investigating", "Service account token used interactively", "svc-backup token material replayed from an interactive workstation logon", "INC-2026-1019", "T1078", "account=CORP\\svc-backup host=EP-WIN-042 logon_type=3→2 source_pid=4820"],
    ["EVT-9107", "2026-10-09T10:48:00", "SRV-AD-01", "Identity", "Identity Provider", "Medium", "New", "Domain account enumeration spike", "42 directory objects queried by a non-administrator account", "", "T1087.002", "actor=CORP\\svc-backup objects=42 window=90s"],
    ["EVT-9106", "2026-10-09T10:30:00", "EP-WIN-017", "Malware", "EDR", "High", "Resolved", "Trojan quarantined on support workstation", "Downloader quarantined after browser helper object execution", "", "", "file=C:\\ProgramData\\brkr.dll verdict=malicious action=quarantined"],
    ["EVT-9105", "2026-10-09T09:52:00", "IDP-SSO-01", "Network", "Network Sensor", "Medium", "Acknowledged", "Password spray from single source", "Low-and-slow attempt against 38 accounts over eleven minutes", "INC-2026-1042", "T1110.003", "src=45.155.205.233 targets=38 failures=38 window=11m"],
    ["EVT-9104", "2026-10-09T09:40:00", "SRV-WEB-01", "Policy", "Cloud Logs", "High", "Investigating", "Management interface reachable from the internet", "Port 8080 answered on the public address of the web server", "INC-2026-1009", "", "host=SRV-WEB-01 port=8080 exposure=public service=admin-console"],
    ["EVT-9103", "2026-10-09T09:14:00", "EP-WIN-042", "Process", "EDR", "Medium", "Acknowledged", "Unsigned binary executed after browser download", "rundll32.exe invoked a DLL from the user temp directory", "INC-2026-1035", "T1218.011", "cmd=rundll32.exe C:\\Users\\m.reyes\\AppData\\Local\\Temp\\a_9f.dll,Start"],
    ["EVT-9102", "2026-10-09T08:58:00", "HONEYPOT-SSH-01", "Deception", "Deception Platform", "Medium", "Acknowledged", "SSH honeypot login attempts", "Fourteen failed logins followed by a banner grab", "", "", "src=103.27.186.9 attempts=14 result=fail user_agents=ssh_2.0"],
    ["EVT-9101", "2026-10-09T08:31:00", "SRV-WEB-01", "Network", "Network Sensor", "Medium", "New", "Port scan against DMZ host", "Sequential scan of 1,024 ports from a single external address", "INC-2026-1009", "T1046", "src=103.27.186.9 dst=10.20.8.10 ports=1024 duration=72s"],
    ["EVT-9100", "2026-10-08T22:41:00", "EP-MAC-003", "DNS", "Network Sensor", "Low", "Resolved", "Rare domain first observed", "First-seen domain recorded for later hunting correlation", "INC-2026-1024", "T1071.004", "qname=api.sync-update[.]cloud category=unclassified registrar=privacy-shield"],
    ["EVT-9099", "2026-10-08T20:15:00", "IDP-SSO-01", "Identity", "Identity Provider", "Medium", "Investigating", "Impossible travel sign-in", "Sign-in from Warsaw nine minutes after a Frankfurt session for the same user", "INC-2026-1028", "T1078", "user=j.chen from=Frankfurt,DE to=Warsaw,PL gap=9m distance=517km"],
    ["EVT-9098", "2026-10-08T19:52:00", "IDP-SSO-01", "Authentication", "Identity Provider", "Low", "Acknowledged", "Legacy authentication protocol used", "ActiveSync authentication for a mailbox that should be modern-auth only", "INC-2026-1028", "", "user=j.chen protocol=ActiveSync client=unknown"],
    ["EVT-9097", "2026-10-08T17:35:00", "BAIT-Q3FORECAST", "Deception", "Deception Platform", "Medium", "Resolved", "Bait document attached to a simulated mail thread", "Decoy file referenced in a test message — expected in the demo environment", "", "", "thread= simulated-message-14 classification=expected-in-demo"],
    ["EVT-9096", "2026-10-08T16:44:00", "EP-WIN-042", "Identity", "Identity Provider", "High", "Investigating", "Kerberos service ticket requests in bulk", "Sixteen service tickets requested within thirty seconds", "INC-2026-1039", "T1558.003", "account=CORP\\svc-backup spns=16 window=30s encryption=RC4"],
    ["EVT-9095", "2026-10-08T15:20:00", "SRV-DB-02", "Process", "EDR", "High", "Investigating", "Interactive logon on a database server", "svc-backup opened an interactive session outside the backup schedule", "INC-2026-1039", "T1078", "host=SRV-DB-02 account=CORP\\svc-backup logon_type=2 schedule_outside=true"],
    ["EVT-9094", "2026-10-08T14:58:00", "EP-ATTACK-000", "Policy", "Cloud Logs", "Low", "Resolved", "Detection content updated", "Rule pack updated — informational event retained for context", "", "", "ruleset=mini-soc-demo version=2026.10.09"],
    ["EVT-9093", "2026-10-08T14:12:00", "EP-ATTACK-000", "Network", "Network Sensor", "Low", "Resolved", "Backup traffic within baseline", "Nightly backup transfer matched the expected profile", "", "", "src=10.20.8.51 bytes=41GB window=01:00–03:00 status=baseline"],
    ["EVT-9092", "2026-10-08T13:47:00", "EP-ATTACK-000", "Email", "Email Gateway", "High", "Acknowledged", "Spearphishing link clicked by user", "Link to a credential-harvesting page opened from a marketing lure", "", "T1566.002", "sender=invoice@pay-notice[.]top link=hxxp://secure-login[.]top/user target=a.torres"],
    ["EVT-9091", "2026-10-08T13:41:00", "EP-ATTACK-000", "Email", "Email Gateway", "Medium", "Resolved", "Phishing message quarantined", "Lookalike invoice message blocked before delivery", "", "", "sender=billing@invo-ice[.]com verdict=phish action=quarantined"],
    ["EVT-9090", "2026-10-08T12:26:00", "EP-ATTACK-000", "Authentication", "VPN", "Low", "Closed", "Failed VPN logins from single source", "Seventy-two rejected attempts against one account", "INC-2026-1004", "T1110", "src=198.51.100.24 account=m.reyes failures=72 window=22m"],
    ["EVT-9089", "2026-10-08T11:58:00", "EP-ATTACK-000", "Authentication", "VPN", "Low", "Closed", "Second wave of failed VPN logins", "Forty-eight rejected attempts rotating user names", "INC-2026-1004", "T1110.003", "src=198.51.100.24 users=12 failures=48 window=17m"],
    ["EVT-9088", "2026-10-08T11:20:00", "EP-ATTACK-000", "Policy", "EDR", "Medium", "Resolved", "Firewall rule drift detected", "A temporary rule persisted past its change window", "", "", "rule=allow-temp-8441 age=36h owner=change-CHG-2210"],
    ["EVT-9087", "2026-10-08T10:44:00", "EP-ATTACK-000", "Identity", "Identity Provider", "Medium", "Investigating", "Bulk mailbox rule creation", "Twelve inbox rules created in four minutes, all redirecting finance keywords", "INC-2026-1015", "", "user=a.torres rules=12 window=4m keywords=invoice,payment,transfer"],
    ["EVT-9086", "2026-10-08T10:40:00", "EP-ATTACK-000", "Email", "Email Gateway", "Medium", "Resolved", "External forwarding rule created", "Mail forwarded to an address outside the organisation", "INC-2026-1015", "", "user=a.torres target=finance-reviews@ext-mail[.]top action=enabled"],
    ["EVT-9085", "2026-10-08T09:35:00", "EP-ATTACK-000", "Process", "EDR", "Medium", "Acknowledged", "Script engine launched by document macro", "Excel spawned a script host after macro execution", "INC-2026-1035", "T1059.001", "parent=EXCEL.EXE child=wscript.exe macro=Auto_Open"],
    ["EVT-9084", "2026-10-08T08:52:00", "EP-ATTACK-000", "Network", "Network Sensor", "Medium", "Acknowledged", "Anomalous outbound bandwidth", "Workstation pushed 340 MB outbound between 02:00 and 03:00", "", "", "src=10.20.4.17 bytes_out=340MB baseline=18MB window=02:00–03:00"],
    ["EVT-9083", "2026-10-07T22:18:00", "EP-ATTACK-000", "Deception", "Deception Platform", "Medium", "Acknowledged", "Simulated directory account enumerated", "Bait account discovered during a directory query in the demo range", "", "", "object=CORP\\svc-temp-admin discovered_by=ldap-query"],
    ["EVT-9082", "2026-10-07T19:05:00", "EP-ATTACK-000", "Authentication", "Identity Provider", "Low", "Resolved", "Password reset completed", "Helpdesk reset for a finance user after MFA fatigue report", "INC-2026-1042", "", "user=m.reyes method=helpdesk verified_by=service-desk"],
    ["EVT-9081", "2026-10-07T16:40:00", "EP-ATTACK-000", "Malware", "EDR", "Medium", "Resolved", "Potentially unwanted application removed", "Browser extension with ad-injection behaviour removed", "", "", "file=ext_chrome_4f2d verdict=pua action=removed"],
    ["EVT-9080", "2026-10-07T15:12:00", "EP-ATTACK-000", "Policy", "Cloud Logs", "Low", "Closed", "Compliance snapshot completed", "Scheduled configuration snapshot stored", "", "", "scope=13-assets result=pass"],
    ["EVT-9079", "2026-10-07T14:06:00", "EP-ATTACK-000", "Network", "Network Sensor", "Low", "Closed", "New internal asset observed", "Unregistered device joined the corporate segment", "", "", "mac=8c:85:90:… vendor=Unknown ip=10.20.5.61"],
    ["EVT-9078", "2026-10-07T12:35:00", "EP-ATTACK-000", "Identity", "Identity Provider", "Low", "Closed", "Dormant account enabled", "An account unused for 180 days was re-enabled by IT operations", "", "", "user=contractor-118 disabled_days=180 enabled_by=it-ops"]
  ];

  var PLACEHOLDER_ASSET = "SRV-WEB-01"; /* assets reused for generic demo events */

  var events = EVENT_ROWS.map(function (row) {
    var asset = row[2] === "EP-ATTACK-000" ? PLACEHOLDER_ASSET : row[2];
    return {
      id: row[0],
      ts: t(row[1]),
      asset: asset,
      type: row[3],
      source: row[4],
      severity: row[5],
      status: row[6],
      title: row[7],
      detail: row[8],
      incident: row[9] || null,
      technique: row[10] || null,
      evidence: row[11]
    };
  });

  /* ---- Incidents -------------------------------------------------------- */
  var incidents = [
    {
      id: "INC-2026-1042",
      title: "Credential stuffing campaign against the SSO portal",
      severity: "Critical",
      status: "Investigating",
      owner: "D. Okafor",
      priority: "P1",
      source: "Detection rule",
      createdAt: t("2026-10-09T13:51:00"),
      updatedAt: t("2026-10-09T14:02:00"),
      riskScore: 86,
      assetIds: ["IDP-SSO-01", "EP-WIN-042"],
      graphNodes: ["ext-vpn", "net-vpn", "idp-sso", "usr-mreyes"],
      techniques: ["T1110.004", "T1110.003", "T1078"],
      summary:
        "A single external address rotated through 412 failed sign-in attempts against the SSO portal in six minutes, followed by one successful authentication for a finance user from a network that had never been seen before.",
      timeline: [
        { ts: t("2026-10-09T13:44:00"), title: "Password spray begins", desc: "38 accounts targeted at a low rate from 45.155.205.233.", tone: "medium" },
        { ts: t("2026-10-09T13:49:00"), title: "Credential stuffing burst", desc: "412 failures in six minutes — rule STUFFING-01 fired.", tone: "critical" },
        { ts: t("2026-10-09T13:52:00"), title: "Successful sign-in", desc: "u-jchen authenticated from ASN 204745 (Warsaw) with no MFA challenge.", tone: "critical" },
        { ts: t("2026-10-09T13:58:00"), title: "Related authentication failures", desc: "268 additional HTTPS authentication failures attributed to the same account.", tone: "high" },
        { ts: t("2026-10-09T14:02:00"), title: "Incident opened", desc: "Analyst D. Okafor assigned; investigation started.", tone: "info" }
      ],
      evidence: [
        { kind: "Source IP", value: "45.155.205.233", note: "ASN 204745 · previously unseen · rotating user agents" },
        { kind: "Targeted account", value: "j.chen", note: "Support engineer · 268 related failures" },
        { kind: "Success event", value: "EVT-9116", note: "Sign-in at 13:52 with device=new, mfa=not-challenged" },
        { kind: "Detection rule", value: "STUFFING-01", note: "Threshold: >200 failures / 10 min / single source" }
      ],
      notes: [
        { ts: t("2026-10-09T14:05:00"), author: "D. Okafor", text: "Source ASN is a known bulletproof range. Treating the successful sign-in as hostile until the user confirms otherwise." },
        { ts: t("2026-10-09T14:20:00"), author: "S. Voss", text: "Checked identity logs: no MFA claim was issued for the 13:52 session — legacy protocol path is the likely gap." }
      ],
      nextSteps: [
        "Confirm with the account holder whether the 13:52 session was legitimate.",
        "Force a credential reset and revoke refresh tokens for u-jchen.",
        "Require step-up MFA on legacy protocol paths at the identity provider.",
        "Rate-limit the source ASN at the WAF and re-run the credential-stuffing hunt query."
      ]
    },
    {
      id: "INC-2026-1039",
      title: "Ransomware precursor activity on SRV-DB-02 and SRV-FILE-01",
      severity: "Critical",
      status: "Contained",
      owner: "A. Iyer",
      priority: "P1",
      source: "Detection rule",
      createdAt: t("2026-10-09T14:15:00"),
      updatedAt: t("2026-10-09T15:12:00"),
      riskScore: 92,
      assetIds: ["EP-WIN-042", "SRV-DB-02", "SRV-FILE-01", "SRV-AD-01"],
      graphNodes: ["ext-c2", "net-c2", "ep-win042", "proc-ps", "proc-mimi", "srv-db02", "srv-file01", "file-stage", "file-enc"],
      techniques: ["T1059.001", "T1003", "T1021.002", "T1071.001", "T1074", "T1486", "T1490"],
      summary:
        "A compromised workstation dropped an encryptor payload, dumped credentials, moved laterally to the database server over SMB, deleted shadow copies and staged a 2.4 GB archive — behaviour consistent with the final stages of a ransomware intrusion. No mass encryption was observed before containment.",
      timeline: [
        { ts: t("2026-10-09T14:05:00"), title: "Encoded PowerShell on EP-WIN-042", desc: "Hidden encoded command launched three levels below Office.", tone: "high" },
        { ts: t("2026-10-09T14:12:00"), title: "SMB lateral movement", desc: "Workstation opened an admin share on SRV-DB-02 as m.reyes.", tone: "high" },
        { ts: t("2026-10-09T14:17:00"), title: "Credential dumping", desc: "Unsigned process read lsass.exe memory on EP-WIN-042.", tone: "critical" },
        { ts: t("2026-10-09T14:22:00"), title: "C2 channel established", desc: "Sixty-second HTTPS beacon from SRV-DB-02 to 185.220.101.14.", tone: "critical" },
        { ts: t("2026-10-09T14:31:00"), title: "Data staged", desc: "2.4 GB 7z archive written to C:\\ProgramData\\stage.7z.", tone: "high" },
        { ts: t("2026-10-09T14:44:00"), title: "Encryptor written", desc: "Unsigned upd_service.exe written through an admin share.", tone: "critical" },
        { ts: t("2026-10-09T14:48:00"), title: "Recovery inhibition attempt", desc: "vssadmin delete shadows /all on SRV-DB-02 — blocked by policy.", tone: "critical" },
        { ts: t("2026-10-09T15:12:00"), title: "Host contained", desc: "EP-WIN-042 isolated from the network by the response team.", tone: "info" }
      ],
      evidence: [
        { kind: "C2 address", value: "185.220.101.14:443", note: "SNI cdn-static[.]live · 60-second cadence · 184 KB out" },
        { kind: "Staged archive", value: "C:\\ProgramData\\stage.7z", note: "2.4 GB · created by 7z.exe under svc-backup" },
        { kind: "Payload hash", value: "sha256:3f9a…c71d", note: "upd_service.exe · unsigned · verdict malicious" },
        { kind: "Lateral path", value: "EP-WIN-042 → SRV-DB-02 (C$)", note: "NTLM over SMB · interactive token reused" },
        { kind: "Recovery attack", value: "vssadmin delete shadows /all", note: "Attempted at 14:48 · blocked by endpoint policy" }
      ],
      notes: [
        { ts: t("2026-10-09T14:52:00"), author: "A. Iyer", text: "Shadow-copy deletion was blocked, so recovery points should be intact. Verifying the 06 Oct backup before declaring recovery." },
        { ts: t("2026-10-09T15:12:00"), author: "A. Iyer", text: "EP-WIN-042 isolated. Containment holds while we decide on the egress block and credential resets." }
      ],
      nextSteps: [
        "Approve the egress block for 185.220.101.14 and reset svc-backup credentials.",
        "Validate the 06 Oct backup set before any restoration work.",
        "Collect a memory image from EP-WIN-042 while it is isolated.",
        "Hunt across the estate for the payload hash and the stage.7z pattern."
      ]
    },
    {
      id: "INC-2026-1035",
      title: "Suspicious PowerShell execution on EP-WIN-042",
      severity: "High",
      status: "Investigating",
      owner: "L. Marsh",
      priority: "P2",
      source: "Detection rule",
      createdAt: t("2026-10-09T14:06:00"),
      updatedAt: t("2026-10-09T14:35:00"),
      riskScore: 74,
      assetIds: ["EP-WIN-042"],
      graphNodes: ["ep-win042", "proc-ps", "proc-rundll"],
      techniques: ["T1059.001", "T1218.011"],
      summary:
        "An Office document spawned a hidden, encoded PowerShell session on the finance workstation. The same host later ran an unsigned DLL through rundll32. This incident overlaps with INC-2026-1039 and shares its root host.",
      timeline: [
        { ts: t("2026-10-09T09:14:00"), title: "rundll32 executes temp DLL", desc: "Unsigned DLL invoked from the user temp directory.", tone: "high" },
        { ts: t("2026-10-09T14:05:00"), title: "Encoded PowerShell", desc: "WINWORD.EXE spawned powershell.exe -w hidden -enc.", tone: "critical" },
        { ts: t("2026-10-09T14:35:00"), title: "Correlated with INC-2026-1039", desc: "Same host, overlapping time window.", tone: "info" }
      ],
      evidence: [
        { kind: "Command line", value: "powershell.exe -w hidden -enc SQBmACgA…", note: "Parent WINWORD.EXE · no user interaction" },
        { kind: "DLL load", value: "rundll32.exe a_9f.dll,Start", note: "Downloaded 09:14 · unsigned" }
      ],
      notes: [
        { ts: t("2026-10-09T14:35:00"), author: "L. Marsh", text: "Keeping this open as the execution-focused view of the wider ransomware incident." }
      ],
      nextSteps: [
        "Extract the encoded command and decode the second-stage script.",
        "Confirm whether the macro document arrived by email or was copied locally."
      ]
    },
    {
      id: "INC-2026-1031",
      title: "Data staging archive on SRV-FILE-01",
      severity: "High",
      status: "New",
      owner: "Unassigned",
      priority: "P2",
      source: "Detection rule",
      createdAt: t("2026-10-09T14:33:00"),
      updatedAt: t("2026-10-09T14:33:00"),
      riskScore: 71,
      assetIds: ["SRV-FILE-01"],
      graphNodes: ["srv-file01", "proc-7z", "file-stage"],
      techniques: ["T1074"],
      summary:
        "A 2.4 GB archive was created outside the backup window by an interactive session. Collection behaviour of this kind usually precedes exfiltration or impact.",
      timeline: [
        { ts: t("2026-10-09T14:26:00"), title: "Archive created", desc: "stage.7z written to C:\\ProgramData.", tone: "high" },
        { ts: t("2026-10-09T14:28:00"), title: "SMB read spike", desc: "1.9 GB read from the finance share in two minutes.", tone: "high" },
        { ts: t("2026-10-09T14:33:00"), title: "Incident opened", desc: "Awaiting triage and assignment.", tone: "info" }
      ],
      evidence: [
        { kind: "Archive", value: "C:\\ProgramData\\stage.7z", note: "2.4 GB · 7z.exe · user svc-backup" },
        { kind: "Read volume", value: "1.9 GB / 2 min", note: "From \\\\SRV-FILE-01\\finance" }
      ],
      notes: [],
      nextSteps: [
        "Assign an owner and confirm whether the archive left the host.",
        "Correlate with the exfiltration watchlist for SRV-FILE-01."
      ]
    },
    {
      id: "INC-2026-1028",
      title: "Impossible travel sign-in for u-jchen",
      severity: "Medium",
      status: "Investigating",
      owner: "S. Voss",
      priority: "P3",
      source: "Detection rule",
      createdAt: t("2026-10-08T20:18:00"),
      updatedAt: t("2026-10-09T09:40:00"),
      riskScore: 58,
      assetIds: ["IDP-SSO-01"],
      graphNodes: ["idp-sso", "net-vpn"],
      techniques: ["T1078"],
      summary:
        "The same account authenticated from Frankfurt and then from Warsaw nine minutes later. The second session also used a legacy authentication protocol.",
      timeline: [
        { ts: t("2026-10-08T19:46:00"), title: "Frankfurt session", desc: "Normal device, modern auth.", tone: "info" },
        { ts: t("2026-10-08T19:52:00"), title: "Legacy protocol used", desc: "ActiveSync authentication recorded.", tone: "medium" },
        { ts: t("2026-10-08T20:05:00"), title: "Warsaw session", desc: "Nine minutes later, 517 km away.", tone: "high" }
      ],
      evidence: [
        { kind: "Distance", value: "517 km in 9 min", note: "Physically implausible travel" },
        { kind: "Protocol", value: "ActiveSync", note: "Legacy path bypassing step-up MFA" }
      ],
      notes: [
        { ts: t("2026-10-09T09:40:00"), author: "S. Voss", text: "User reports no travel; possible VPN usage not yet excluded." }
      ],
      nextSteps: ["Confirm travel/VPN status with the user.", "Disable legacy authentication for the account."]
    },
    {
      id: "INC-2026-1024",
      title: "Periodic DNS beaconing from EP-MAC-003",
      severity: "Medium",
      status: "Contained",
      owner: "L. Marsh",
      priority: "P3",
      source: "Hunt query",
      createdAt: t("2026-10-08T22:45:00"),
      updatedAt: t("2026-10-09T10:15:00"),
      riskScore: 55,
      assetIds: ["EP-MAC-003"],
      graphNodes: ["ep-mac003", "net-c2"],
      techniques: ["T1071.004"],
      summary:
        "A workstation has queried a rare domain at a steady 60-second cadence for two days. The domain has no prior history in the environment.",
      timeline: [
        { ts: t("2026-10-07T22:18:00"), title: "Rare domain first seen", desc: "api.sync-update[.]cloud recorded.", tone: "medium" },
        { ts: t("2026-10-08T22:41:00"), title: "Cadence confirmed", desc: "Stable 60-second interval over 24 hours.", tone: "high" },
        { ts: t("2026-10-09T10:15:00"), title: "DNS sinkhole applied", desc: "Domain sinkholed pending analysis.", tone: "info" }
      ],
      evidence: [
        { kind: "Domain", value: "api.sync-update[.]cloud", note: "Registered 12 days ago · privacy-shield registrar" },
        { kind: "Cadence", value: "60 s ± 2 s", note: "1,394 queries over 24 hours" }
      ],
      notes: [],
      nextSteps: ["Pull a PCAP sample for the sinkholed domain.", "Run the beacon hunt query across the laptop fleet."]
    },
    {
      id: "INC-2026-1019",
      title: "Decoy file share accessed by a service account",
      severity: "High",
      status: "Investigating",
      owner: "D. Okafor",
      priority: "P2",
      source: "Deception",
      createdAt: t("2026-10-09T11:35:00"),
      updatedAt: t("2026-10-09T12:40:00"),
      riskScore: 66,
      assetIds: ["DECOY-FILESVR", "BAIT-Q3FORECAST", "EP-WIN-042"],
      graphNodes: ["decoy-share", "usr-svc", "ep-win042"],
      techniques: ["T1078"],
      summary:
        "A simulated bait share was read and a bait document opened from the same workstation that later showed ransomware precursor activity. No legitimate process should touch these assets.",
      timeline: [
        { ts: t("2026-10-09T11:24:00"), title: "Share enumerated", desc: "\\\\DECOY-FILESVR\\payroll listed by svc-backup.", tone: "high" },
        { ts: t("2026-10-09T11:27:00"), title: "Bait document opened", desc: "Q3-forecast.xlsx triggered the callback.", tone: "critical" },
        { ts: t("2026-10-09T11:31:00"), title: "Files read", desc: "14 reads from the bait share.", tone: "high" },
        { ts: t("2026-10-09T11:35:00"), title: "Incident opened", desc: "Deception alert promoted to an incident.", tone: "info" }
      ],
      evidence: [
        { kind: "Share", value: "\\\\DECOY-FILESVR\\payroll", note: "Simulated · no production data" },
        { kind: "Account", value: "CORP\\svc-backup", note: "Used interactively from EP-WIN-042" },
        { kind: "Bait document", value: "Q3-forecast.xlsx", note: "Callback received 11:27" }
      ],
      notes: [
        { ts: t("2026-10-09T12:40:00"), author: "D. Okafor", text: "Deception telemetry is simulated in this demo, but the account overlap with INC-2026-1039 is worth tracking." }
      ],
      nextSteps: ["Confirm which process used the svc-backup token.", "Correlate the access time with the staging activity on SRV-FILE-01."]
    },
    {
      id: "INC-2026-1015",
      title: "Bulk mailbox rule creation with external forwarding",
      severity: "Medium",
      status: "Resolved",
      owner: "S. Voss",
      priority: "P3",
      source: "Detection rule",
      createdAt: t("2026-10-08T10:46:00"),
      updatedAt: t("2026-10-08T15:20:00"),
      riskScore: 44,
      assetIds: ["IDP-SSO-01"],
      graphNodes: ["idp-sso"],
      techniques: [],
      summary:
        "Twelve inbox rules were created in four minutes targeting finance keywords, with one rule forwarding externally. The account holder confirmed the rules were not created by them; rules were removed and the session revoked.",
      timeline: [
        { ts: t("2026-10-08T10:44:00"), title: "Rules created", desc: "12 rules in 4 minutes.", tone: "medium" },
        { ts: t("2026-10-08T11:02:00"), title: "Rules removed", desc: "All rules deleted, session revoked.", tone: "info" },
        { ts: t("2026-10-08T15:20:00"), title: "Incident resolved", desc: "User confirmed compromise attempt.", tone: "info" }
      ],
      evidence: [
        { kind: "Rules", value: "12 inbox rules", note: "Keywords: invoice, payment, transfer" },
        { kind: "Forward target", value: "finance-reviews@ext-mail[.]top", note: "External domain" }
      ],
      notes: [],
      nextSteps: ["Monitor the mailbox for repeat rule creation for 30 days."]
    },
    {
      id: "INC-2026-1009",
      title: "Management interface exposed on SRV-WEB-01",
      severity: "Low",
      status: "Closed",
      owner: "A. Iyer",
      priority: "P4",
      source: "Manual",
      createdAt: t("2026-10-09T09:20:00"),
      updatedAt: t("2026-10-09T13:05:00"),
      riskScore: 30,
      assetIds: ["SRV-WEB-01"],
      graphNodes: ["srv-web01", "ext-scan", "net-scan"],
      techniques: ["T1046"],
      summary:
        "An administrative console answered on a public port after a configuration change. The port was closed and the change process updated.",
      timeline: [
        { ts: t("2026-10-09T08:31:00"), title: "Port scan observed", desc: "External scan of 1,024 ports.", tone: "medium" },
        { ts: t("2026-10-09T09:14:00"), title: "Console exposed", desc: "Port 8080 answered publicly.", tone: "high" },
        { ts: t("2026-10-09T13:05:00"), title: "Closed", desc: "Port blocked; change record updated.", tone: "info" }
      ],
      evidence: [
        { kind: "Port", value: "10.20.8.10:8080", note: "admin-console · exposure public" },
        { kind: "Scanner", value: "103.27.186.9", note: "1,024 ports in 72 s" }
      ],
      notes: [],
      nextSteps: ["Add external exposure checks to the weekly configuration review."]
    },
    {
      id: "INC-2026-1004",
      title: "Repeated failed VPN logins",
      severity: "Low",
      status: "Closed",
      owner: "Unassigned",
      priority: "P4",
      source: "Detection rule",
      createdAt: t("2026-10-08T12:30:00"),
      updatedAt: t("2026-10-08T18:00:00"),
      riskScore: 26,
      assetIds: ["IDP-SSO-01"],
      graphNodes: [],
      techniques: ["T1110"],
      summary:
        "Two waves of failed VPN logins from a single address. No successful authentication followed; throttling was applied automatically.",
      timeline: [
        { ts: t("2026-10-08T12:26:00"), title: "First wave", desc: "72 failures against one account.", tone: "medium" },
        { ts: t("2026-10-08T12:58:00"), title: "Second wave", desc: "48 failures rotating 12 users.", tone: "medium" },
        { ts: t("2026-10-08T18:00:00"), title: "Closed", desc: "Throttling in place; no compromise found.", tone: "info" }
      ],
      evidence: [
        { kind: "Source", value: "198.51.100.24", note: "120 total failures · 0 successes" }
      ],
      notes: [],
      nextSteps: []
    }
  ];

  /* ---- Aggregates -------------------------------------------------------
     eventSeries: 6-hour buckets over the last 7 days (sample volume).
     severityTotals: 7-day totals used by distribution charts.
     ---------------------------------------------------------------------- */
  var seriesValues = [
    138, 205, 176, 141, 162, 219, 244, 187,
    154, 173, 231, 268, 209, 176, 148, 192,
    226, 257, 198, 165, 181, 236, 289, 241,
    173, 158, 214, 302, 264, 196, 187, 248,
    318, 276, 205, 171, 196, 259, 341, 288,
    212, 184, 231, 297, 356, 312, 246, 209,
    254, 321, 388, 344, 268, 233, 289, 367
  ];
  var bucketMs = 6 * 60 * 60 * 1000;
  var seriesStart = NOW - seriesValues.length * bucketMs;
  var eventSeries = seriesValues.map(function (value, index) {
    var from = seriesStart + index * bucketMs;
    return { from: from, to: from + bucketMs, value: value };
  });

  var severityTotals = [
    { severity: "Critical", value: 84 },
    { severity: "High", value: 402 },
    { severity: "Medium", value: 1268 },
    { severity: "Low", value: 1742 },
    { severity: "Informational", value: 686 }
  ];

  /* ---- Recent activity (overview timeline) ----------------------------- */
  var activity = [
    { ts: t("2026-10-09T15:12:00"), tone: "info", title: "Host isolated by response team", desc: "EP-WIN-042 disconnected from the network under INC-2026-1039.", link: "investigation.html?id=INC-2026-1039", linkLabel: "Open incident" },
    { ts: t("2026-10-09T14:48:00"), tone: "critical", title: "Recovery inhibition attempt blocked", desc: "vssadmin delete shadows /all on SRV-DB-02 (sample event EVT-9124).", link: "events.html?event=EVT-9124", linkLabel: "View event" },
    { ts: t("2026-10-09T14:33:00"), tone: "high", title: "Incident opened", desc: "INC-2026-1031 · Data staging archive on SRV-FILE-01.", link: "incidents.html", linkLabel: "Incidents" },
    { ts: t("2026-10-09T14:02:00"), tone: "high", title: "Credential stuffing campaign detected", desc: "INC-2026-1042 assigned to D. Okafor.", link: "investigation.html?id=INC-2026-1042", linkLabel: "Open incident" },
    { ts: t("2026-10-09T12:40:00"), tone: "medium", title: "Deception alert triaged", desc: "Decoy share access linked to the svc-backup token (INC-2026-1019).", link: "deception.html", linkLabel: "Cyber deception" },
    { ts: t("2026-10-09T10:15:00"), tone: "medium", title: "DNS sinkhole applied", desc: "api.sync-update[.]cloud sinkholed pending analysis.", link: "threat-hunting.html", linkLabel: "Hunt library" },
    { ts: t("2026-10-09T09:20:00"), tone: "low", title: "Exposure finding opened", desc: "SRV-WEB-01 administrative console reachable externally.", link: "investigation.html?id=INC-2026-1009", linkLabel: "Open incident" },
    { ts: t("2026-10-08T18:00:00"), tone: "info", title: "Incident closed", desc: "INC-2026-1004 · failed VPN logins with no successful authentication.", link: "incidents.html", linkLabel: "Incidents" }
  ];

  /* ---- Notifications (demo) -------------------------------------------- */
  var notifications = [
    { id: "NTF-1", ts: t("2026-10-09T15:12:00"), title: "Containment action completed", desc: "EP-WIN-042 isolated under INC-2026-1039.", read: false, tone: "info", link: "incident-response.html?id=INC-2026-1039" },
    { id: "NTF-2", ts: t("2026-10-09T14:48:00"), title: "Critical event on SRV-DB-02", desc: "Shadow copy deletion attempt (EVT-9124).", read: false, tone: "critical", link: "events.html?event=EVT-9124" },
    { id: "NTF-3", ts: t("2026-10-09T14:33:00"), title: "Unassigned incident waiting for triage", desc: "INC-2026-1031 has no owner yet.", read: false, tone: "high", link: "incidents.html" },
    { id: "NTF-4", ts: t("2026-10-09T12:40:00"), title: "Deception alert promoted", desc: "INC-2026-1019 moved to Investigating.", read: true, tone: "medium", link: "deception.html" },
    { id: "NTF-5", ts: t("2026-10-08T18:00:00"), title: "Incident closed", desc: "INC-2026-1004 closed with no compromise found.", read: true, tone: "info", link: "incidents.html" }
  ];

  /* ---- Recent hunting results (overview) -------------------------------- */
  var huntingFindings = [
    { id: "HUNT-01", title: "Beacon cadence above 60 s tolerance", queryId: "SQ-3", matches: 14, ts: t("2026-10-09T10:12:00"), status: "Escalated", incident: "INC-2026-1024" },
    { id: "HUNT-02", title: "Credential dumping artefacts on member servers", queryId: "SQ-4", matches: 6, ts: t("2026-10-09T14:20:00"), status: "Escalated", incident: "INC-2026-1039" },
    { id: "HUNT-03", title: "Decoy asset interaction by service accounts", queryId: "SQ-5", matches: 3, ts: t("2026-10-09T11:36:00"), status: "Escalated", incident: "INC-2026-1019" },
    { id: "HUNT-04", title: "Legacy authentication protocol usage", queryId: "SQ-2", matches: 22, ts: t("2026-10-08T21:04:00"), status: "Reviewed — no action", incident: null }
  ];

  SOC.demo = {
    env: {
      name: "Mini-SOC demo workspace",
      mode: "demo",
      now: NOW,
      dataLabel: "Sample data",
      rangeLabel: "07 Oct 2026 – 09 Oct 2026",
      version: "1.0.0-demo",
      sensorCount: 13,
      detectedThreats: 134,
      claimNote:
        "All records on this page are demo data generated locally in the browser. No live telemetry, AI model or backend is connected."
    },
    actors: actors,
    assets: assets,
    techniques: techniques,
    events: events,
    incidents: incidents,
    eventSeries: eventSeries,
    severityTotals: severityTotals,
    activity: activity,
    notifications: notifications,
    huntingFindings: huntingFindings
  };
})();
