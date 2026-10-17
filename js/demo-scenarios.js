/* ==========================================================================
   Mini-SOC · demo-scenarios.js — central sample-data layer (PART 2 of 2)
   --------------------------------------------------------------------------
   SAMPLE / DEMO data only:
     SOC.demo.graph     attack-graph nodes, edges and the sample attack path
     SOC.demo.hunting   saved queries, query history
     SOC.demo.decoys    simulated deception assets + interaction timeline
     SOC.demo.ai        evidence-grounded analysis samples per incident
     SOC.demo.response  response recommendations + workflow + audit entries

   Backend integration point: same as demo-data.js — replace through
   SOC.services, never from page code.
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};

  function t(iso) {
    return Date.parse(iso);
  }

  /* ======================================================================
     Attack graph — deterministic sample layout (explicit coordinates).
     Node types: user · endpoint · server · external · process · file ·
                 network · decoy
     ====================================================================== */
  var nodes = [
    /* External */
    { id: "ext-c2", type: "external", label: "185.220.101.14", sub: "C2 infrastructure", x: 95, y: 110, risk: "critical", compromised: true, techniques: ["T1071.001"], eventIds: ["EVT-9121"], asset: null },
    { id: "ext-vpn", type: "external", label: "45.155.205.233", sub: "Credential stuffing source", x: 95, y: 335, risk: "high", compromised: true, techniques: ["T1110.004"], eventIds: ["EVT-9115", "EVT-9116", "EVT-9105"], asset: null },
    { id: "ext-scan", type: "external", label: "103.27.186.9", sub: "Internet scanner", x: 95, y: 565, risk: "medium", compromised: false, techniques: ["T1046"], eventIds: ["EVT-9101", "EVT-9102"], asset: null },

    /* Network connections */
    { id: "net-c2", type: "network", label: "HTTPS beacon", sub: "C2 channel · 60 s cadence", x: 285, y: 110, risk: "critical", compromised: true, techniques: ["T1071.001"], eventIds: ["EVT-9121"], asset: null },
    { id: "net-vpn", type: "network", label: "SSO auth traffic", sub: "Authentication channel", x: 285, y: 335, risk: "high", compromised: true, techniques: ["T1110.003"], eventIds: ["EVT-9117", "EVT-9105", "EVT-9090"], asset: "IDP-SSO-01" },
    { id: "net-scan", type: "network", label: "Port scan", sub: "Reconnaissance traffic", x: 285, y: 565, risk: "medium", compromised: false, techniques: ["T1046"], eventIds: ["EVT-9101"], asset: null },

    /* Endpoints */
    { id: "ep-win042", type: "endpoint", label: "EP-WIN-042", sub: "Workstation · M. Reyes", x: 485, y: 100, risk: "critical", compromised: true, suspicious: true, techniques: ["T1059.001", "T1003"], eventIds: ["EVT-9120", "EVT-9119", "EVT-9118", "EVT-9114", "EVT-9103"], asset: "EP-WIN-042" },
    { id: "ep-mac003", type: "endpoint", label: "EP-MAC-003", sub: "Laptop · A. Torres", x: 480, y: 350, risk: "medium", compromised: false, suspicious: true, techniques: ["T1071.004"], eventIds: ["EVT-9112", "EVT-9100"], asset: "EP-MAC-003" },
    { id: "ep-win017", type: "endpoint", label: "EP-WIN-017", sub: "Workstation · J. Chen", x: 485, y: 610, risk: "medium", compromised: false, techniques: [], eventIds: ["EVT-9106"], asset: "EP-WIN-017" },

    /* Processes */
    { id: "proc-ps", type: "process", label: "powershell.exe", sub: "Encoded command", x: 675, y: 75, risk: "critical", compromised: true, suspicious: true, techniques: ["T1059.001"], eventIds: ["EVT-9118", "EVT-9114"], asset: "EP-WIN-042" },
    { id: "proc-rundll", type: "process", label: "rundll32.exe", sub: "Signed-binary abuse", x: 672, y: 210, risk: "high", compromised: true, techniques: ["T1218.011"], eventIds: ["EVT-9103"], asset: "EP-WIN-042" },
    { id: "proc-mimi", type: "process", label: "lsass access", sub: "Credential dumping", x: 678, y: 350, risk: "critical", compromised: true, suspicious: true, techniques: ["T1003", "T1558.003"], eventIds: ["EVT-9120", "EVT-9096"], asset: "EP-WIN-042" },
    { id: "proc-7z", type: "process", label: "7z.exe", sub: "Archiving utility", x: 675, y: 530, risk: "high", compromised: true, techniques: ["T1074"], eventIds: ["EVT-9122"], asset: "SRV-FILE-01" },

    /* Servers */
    { id: "srv-web01", type: "server", label: "SRV-WEB-01", sub: "Web · DMZ", x: 872, y: 70, risk: "high", compromised: false, suspicious: true, techniques: ["T1046"], eventIds: ["EVT-9104", "EVT-9101"], asset: "SRV-WEB-01" },
    { id: "idp-sso", type: "server", label: "IDP-SSO-01", sub: "SSO portal · DMZ", x: 872, y: 165, risk: "high", compromised: false, techniques: ["T1110.004"], eventIds: ["EVT-9115", "EVT-9116", "EVT-9099"], asset: "IDP-SSO-01" },
    { id: "srv-db02", type: "server", label: "SRV-DB-02", sub: "Database · Core", x: 875, y: 275, risk: "critical", compromised: true, suspicious: true, techniques: ["T1490", "T1021.002"], eventIds: ["EVT-9124", "EVT-9121", "EVT-9095"], asset: "SRV-DB-02" },
    { id: "srv-file01", type: "server", label: "SRV-FILE-01", sub: "File share · Core", x: 872, y: 455, risk: "high", compromised: true, techniques: ["T1074", "T1486"], eventIds: ["EVT-9123", "EVT-9122"], asset: "SRV-FILE-01" },
    { id: "srv-ad01", type: "server", label: "SRV-AD-01", sub: "Domain controller", x: 876, y: 615, risk: "high", compromised: false, techniques: ["T1087.002"], eventIds: ["EVT-9107"], asset: "SRV-AD-01" },

    /* Users */
    { id: "usr-mreyes", type: "user", label: "M. Reyes", sub: "Finance analyst", x: 1085, y: 75, risk: "low", compromised: false, techniques: ["T1110"], eventIds: ["EVT-9113", "EVT-9082"], asset: null },
    { id: "usr-svc", type: "user", label: "svc-backup", sub: "Service account", x: 1090, y: 215, risk: "high", compromised: true, techniques: ["T1078"], eventIds: ["EVT-9108", "EVT-9110"], asset: null },

    /* Files */
    { id: "file-stage", type: "file", label: "stage.7z", sub: "2.4 GB staged archive", x: 1088, y: 385, risk: "high", compromised: true, techniques: ["T1074"], eventIds: ["EVT-9122"], asset: "SRV-FILE-01" },
    { id: "file-enc", type: "file", label: "upd_service.exe", sub: "Encryptor payload", x: 1092, y: 520, risk: "critical", compromised: true, suspicious: true, techniques: ["T1486"], eventIds: ["EVT-9123"], asset: "SRV-FILE-01" },

    /* Decoys */
    { id: "decoy-share", type: "decoy", label: "DECOY-FILESVR", sub: "Simulated bait share", x: 675, y: 685, risk: "high", compromised: false, techniques: ["T1078"], eventIds: ["EVT-9110", "EVT-9109"], asset: "DECOY-FILESVR" },
    { id: "decoy-acct", type: "decoy", label: "svc-temp-admin", sub: "Simulated bait account", x: 1090, y: 675, risk: "medium", compromised: false, techniques: ["T1087.002"], eventIds: ["EVT-9083", "EVT-9107"], asset: "DECOY-AD-TEMP" }
  ];

  /* label, from → to, technique (optional) */
  var edgeDefs = [
    ["HTTPS transport", "ext-c2", "net-c2", "T1071.001"],
    ["Inbound C2", "net-c2", "ep-win042", null],
    ["Spawns hidden shell", "ep-win042", "proc-ps", "T1059.001"],
    ["Injects credential tool", "proc-ps", "proc-mimi", "T1003"],
    ["SMB admin share", "proc-mimi", "srv-db02", "T1021.002"],
    ["Copies tooling", "srv-db02", "srv-file01", null],
    ["Writes archive", "srv-file01", "file-stage", "T1074"],
    ["Drops payload", "srv-file01", "file-enc", "T1486"],
    ["Credential stuffing", "ext-vpn", "net-vpn", "T1110.004"],
    ["Auth attempts", "net-vpn", "idp-sso", "T1110.003"],
    ["Scan traffic", "ext-scan", "net-scan", null],
    ["Service probe", "net-scan", "srv-web01", "T1046"],
    ["Rare-DNS beacon", "ep-mac003", "net-c2", "T1071.004"],
    ["Routine file access", "ep-win017", "srv-file01", null],
    ["Executes DLL", "srv-web01", "proc-rundll", "T1218.011"],
    ["Runs archiver", "srv-file01", "proc-7z", null],
    ["Creates archive", "proc-7z", "file-stage", "T1074"],
    ["Owns service account", "srv-ad01", "usr-svc", "T1078"],
    ["Reads bait share", "usr-svc", "decoy-share", "T1078"],
    ["Enumerates bait account", "proc-mimi", "decoy-acct", "T1087.002"],
    ["User logon", "usr-mreyes", "ep-win042", null],
    ["Kerberos requests", "proc-mimi", "srv-ad01", "T1558.003"],
    ["SSO sign-in", "usr-mreyes", "idp-sso", null],
    ["Encrypts volumes", "file-enc", "srv-db02", "T1486"],
    ["Interactive token use", "proc-mimi", "usr-svc", "T1078"]
  ];

  var attackPath = [
    "ext-c2",
    "net-c2",
    "ep-win042",
    "proc-ps",
    "proc-mimi",
    "srv-db02",
    "srv-file01",
    "file-enc"
  ];

  var pathPairs = {};
  for (var i = 0; i < attackPath.length - 1; i++) {
    pathPairs[attackPath[i] + ">" + attackPath[i + 1]] = true;
    pathPairs[attackPath[i + 1] + ">" + attackPath[i]] = true;
  }

  var edges = edgeDefs.map(function (def, index) {
    return {
      id: "EDGE-" + (index + 1),
      label: def[0],
      from: def[1],
      to: def[2],
      technique: def[3],
      onPath: !!pathPairs[def[1] + ">" + def[2]]
    };
  });

  /* ======================================================================
     Threat hunting
     ====================================================================== */
  var savedQueries = [
    {
      id: "SQ-1",
      name: "Suspicious PowerShell on workstations",
      text: "type:Process powershell encoded",
      filters: ["endpoints"],
      description: "Finds process events mentioning PowerShell with encoded or hidden flags.",
      owner: "L. Marsh",
      updated: t("2026-10-09T08:20:00")
    },
    {
      id: "SQ-2",
      name: "Failed authentication bursts",
      text: "type:Authentication failed",
      filters: ["credentials", "network"],
      description: "Authentication failures from identity and VPN sources.",
      owner: "D. Okafor",
      updated: t("2026-10-09T07:05:00")
    },
    {
      id: "SQ-3",
      name: "Beaconing to rare domains",
      text: "beacon rare domain",
      filters: ["network", "behavioral"],
      description: "Periodic DNS or HTTP callbacks to infrastructure with no history here.",
      owner: "L. Marsh",
      updated: t("2026-10-08T16:44:00")
    },
    {
      id: "SQ-4",
      name: "Credential dumping artefacts",
      text: "type:Process lsass credential",
      filters: ["credentials", "endpoints"],
      description: "Endpoint process events referencing LSASS or credential access.",
      owner: "A. Iyer",
      updated: t("2026-10-09T14:22:00")
    },
    {
      id: "SQ-5",
      name: "Decoy asset interactions",
      text: "type:Deception",
      filters: ["endpoints"],
      description: "Any interaction with simulated deception assets.",
      owner: "D. Okafor",
      updated: t("2026-10-09T11:40:00")
    },
    {
      id: "SQ-6",
      name: "Lateral movement over SMB",
      text: "smb lateral share",
      filters: ["network"],
      description: "SMB sessions involving administrative shares between internal hosts.",
      owner: "A. Iyer",
      updated: t("2026-10-09T14:30:00")
    }
  ];

  var queryHistory = [
    { id: "QH-1", ts: t("2026-10-09T14:30:00"), text: "smb lateral share", filters: ["network"], matches: 4 },
    { id: "QH-2", ts: t("2026-10-09T11:36:00"), text: "type:Deception", filters: ["endpoints"], matches: 3 },
    { id: "QH-3", ts: t("2026-10-09T10:12:00"), text: "beacon rare domain", filters: ["network", "behavioral"], matches: 4 },
    { id: "QH-4", ts: t("2026-10-08T21:04:00"), text: "type:Authentication failed", filters: ["credentials"], matches: 7 },
    { id: "QH-5", ts: t("2026-10-08T15:10:00"), text: "archive staged", filters: ["behavioral"], matches: 2 }
  ];

  /* ======================================================================
     Cyber deception — simulated assets and interactions
     ====================================================================== */
  var decoys = [
    {
      id: "DECOY-FILESVR",
      name: "DECOY-FILESVR",
      type: "File share honeypot",
      purpose: "Simulated SMB share seeded with bait documents in the finance naming scheme.",
      represents: "A high-value file share that an attacker would reach during lateral movement and staging.",
      status: "Triggered",
      ip: "10.20.9.40",
      lastTrigger: t("2026-10-09T11:31:00"),
      interactions: 4,
      relatedIncidents: ["INC-2026-1019"]
    },
    {
      id: "BAIT-Q3FORECAST",
      name: "Q3-forecast.xlsx",
      type: "Bait document",
      purpose: "Simulated spreadsheet that reports back when opened.",
      represents: "A document an intruder would copy and open while searching for financial data.",
      status: "Triggered",
      ip: "—",
      lastTrigger: t("2026-10-09T11:27:00"),
      interactions: 2,
      relatedIncidents: ["INC-2026-1019"]
    },
    {
      id: "DECOY-AD-TEMP",
      name: "svc-temp-admin",
      type: "Bait directory account",
      purpose: "Simulated account with plausible naming and no legitimate use.",
      represents: "A privileged-looking account that should never appear in normal directory enumeration.",
      status: "Armed",
      ip: "—",
      lastTrigger: t("2026-10-07T22:18:00"),
      interactions: 1,
      relatedIncidents: []
    },
    {
      id: "DECOY-DB-LEGACY",
      name: "DECOY-DB-LEGACY",
      type: "Database honeypot",
      purpose: "Simulated legacy SQL instance listening on an internal address.",
      represents: "An out-of-support database that looks attractive for unpatched exploit attempts.",
      status: "Armed",
      ip: "10.20.9.52",
      lastTrigger: t("2026-10-05T16:30:00"),
      interactions: 1,
      relatedIncidents: []
    },
    {
      id: "HONEYPOT-SSH-01",
      name: "HONEYPOT-SSH-01",
      type: "Network honeypot",
      purpose: "Simulated internet-facing SSH service with banner capture.",
      represents: "A low-hanging target that attracts opportunistic scanning and brute force.",
      status: "Armed",
      ip: "10.20.8.90",
      lastTrigger: t("2026-10-09T08:58:00"),
      interactions: 14,
      relatedIncidents: []
    }
  ];

  var deceptionTimeline = [
    { ts: t("2026-10-09T11:31:00"), decoy: "DECOY-FILESVR", actor: "CORP\\svc-backup", action: "14 file reads from the bait share", severity: "High", incident: "INC-2026-1019" },
    { ts: t("2026-10-09T11:27:00"), decoy: "BAIT-Q3FORECAST", actor: "EP-WIN-042", action: "Bait document opened — callback received", severity: "High", incident: "INC-2026-1019" },
    { ts: t("2026-10-09T11:24:00"), decoy: "DECOY-FILESVR", actor: "CORP\\svc-backup", action: "Share enumerated (14 objects listed)", severity: "Medium", incident: "INC-2026-1019" },
    { ts: t("2026-10-09T08:58:00"), decoy: "HONEYPOT-SSH-01", actor: "103.27.186.9", action: "14 failed logins and a banner grab", severity: "Medium", incident: null },
    { ts: t("2026-10-07T22:18:00"), decoy: "DECOY-AD-TEMP", actor: "directory query", action: "Bait account discovered during enumeration", severity: "Medium", incident: null },
    { ts: t("2026-10-05T16:30:00"), decoy: "DECOY-DB-LEGACY", actor: "10.20.5.61", action: "Login attempt with default credentials", severity: "Low", incident: null }
  ];

  /* ======================================================================
     AI analysis samples — explicitly labelled as sample output
     ====================================================================== */
  var ai = {
    "INC-2026-1039": {
      incidentId: "INC-2026-1039",
      label: "Sample analysis — generated from demo records, not by a live model",
      generatedAt: t("2026-10-09T15:05:00"),
      confidence: 78,
      summary:
        "The records are consistent with the final phase of a ransomware intrusion that began on EP-WIN-042 and spread to two core servers. The sequence — hidden PowerShell, credential dumping, SMB lateral movement, C2 beacon, staging archive, payload delivery and a shadow-copy deletion attempt — matches the ordering typically seen before encryption. Containment of the originating workstation at 15:12 appears to have interrupted the chain before mass file encryption started.",
      facts: [
        { text: "Encoded, hidden PowerShell ran on EP-WIN-042 at 14:05 with WINWORD.EXE as parent.", refs: ["EVT-9118"] },
        { text: "An unsigned process opened LSASS memory with VM_READ rights at 14:17.", refs: ["EVT-9120"] },
        { text: "An SMB session to the C$ share of SRV-DB-02 was established from EP-WIN-042 at 14:12 using NTLM.", refs: ["EVT-9119"] },
        { text: "SRV-DB-02 emitted a 60-second HTTPS beacon to 185.220.101.14 starting at 14:22.", refs: ["EVT-9121"] },
        { text: "A 2.4 GB 7z archive was written to C:\\ProgramData\\stage.7z at 14:31.", refs: ["EVT-9122"] },
        { text: "vssadmin delete shadows /all was attempted on SRV-DB-02 at 14:48 and was blocked by policy.", refs: ["EVT-9124"] }
      ],
      hypotheses: [
        {
          title: "Manual intrusion escalating to ransomware deployment",
          likelihood: "Most likely",
          confidence: 78,
          text: "The ordering and the presence of a staged archive plus an unused encryptor suggest operators preparing for encryption rather than a fully automated payload. No mass rename or entropy spike is present in the records.",
          refs: ["EVT-9122", "EVT-9123"]
        },
        {
          title: "Automated ransomware loader that was interrupted",
          likelihood: "Possible",
          confidence: 44,
          text: "Containment at 15:12 happened before any observed encryption burst, so an automated sequence cannot be ruled out — it may simply not have run yet.",
          refs: ["EVT-9124"]
        },
        {
          title: "Red-team or validation exercise",
          likelihood: "Unlikely",
          confidence: 12,
          text: "No matching change record or exercise window appears in the demo audit data, and the C2 address is not part of any documented range.",
          refs: []
        }
      ],
      recommendations: [
        "Preserve volatile evidence from EP-WIN-042 before rebuilding it.",
        "Validate the 06 Oct backup set for both affected servers.",
        "Search the estate for sha256:3f9a…c71d and for any file named stage.7z.",
        "Review how svc-backup obtained an interactive token on a workstation."
      ],
      uncertainty:
        "The sample dataset contains no process-tree depth beyond three levels, no memory artefacts and no netflow. Attribution, initial access vector and whether data actually left the network cannot be determined from these records alone."
    },
    "INC-2026-1042": {
      incidentId: "INC-2026-1042",
      label: "Sample analysis — generated from demo records, not by a live model",
      generatedAt: t("2026-10-09T14:25:00"),
      confidence: 64,
      summary:
        "Traffic against the SSO portal shows a credential-stuffing pattern followed by one successful sign-in from an unseen network. The absence of an MFA challenge on that success is the most concerning detail: it suggests either a legacy protocol path or a token-replay, and it is the main reason the incident is graded Critical.",
      facts: [
        { text: "412 failed sign-in attempts from 45.155.205.233 in six minutes.", refs: ["EVT-9115"] },
        { text: "A successful authentication for u-jchen followed from ASN 204745 with device=new.", refs: ["EVT-9116"] },
        { text: "No MFA claim was recorded for the successful session.", refs: ["EVT-9116"] },
        { text: "A password spray against 38 accounts ran earlier from the same source.", refs: ["EVT-9105"] }
      ],
      hypotheses: [
        {
          title: "Valid credentials bought from a breach collection",
          likelihood: "Most likely",
          confidence: 64,
          text: "A single success after hundreds of failures on one account is more consistent with a correct credential appearing in a stuffing list than with guessing.",
          refs: ["EVT-9115", "EVT-9116"]
        },
        {
          title: "MFA bypass through a legacy protocol path",
          likelihood: "Possible",
          confidence: 52,
          text: "A related incident records ActiveSync authentication for the same tenant, which would explain the missing MFA claim.",
          refs: ["EVT-9098"]
        },
        {
          title: "Legitimate user on a new network",
          likelihood: "Possible",
          confidence: 30,
          text: "The account holder has not yet confirmed or denied the session; a corporate VPN exit is not excluded by the demo records.",
          refs: []
        }
      ],
      recommendations: [
        "Confirm the 13:52 session with the account holder before resetting credentials.",
        "Check which authentication protocol accepted the successful sign-in.",
        "Correlate the source address with the impossible-travel incident for the same tenant."
      ],
      uncertainty:
        "The demo dataset has no protocol-level detail for the success event and no device-trust signals, so the difference between credential theft and token replay cannot be settled from these records."
    },
    "INC-2026-1035": {
      incidentId: "INC-2026-1035",
      label: "Sample analysis — generated from demo records, not by a live model",
      generatedAt: t("2026-10-09T14:38:00"),
      confidence: 58,
      summary:
        "Execution activity on EP-WIN-042 is consistent with a macro-driven initial foothold. Because the same host is at the centre of the ransomware incident, this record is best treated as the execution-focused view of that chain rather than an independent event.",
      facts: [
        { text: "WINWORD.EXE spawned a hidden encoded PowerShell session at 14:05.", refs: ["EVT-9118"] },
        { text: "rundll32.exe executed an unsigned DLL from the user temp directory at 09:14.", refs: ["EVT-9103"] },
        { text: "An Excel macro spawned a script host on 08 Oct.", refs: ["EVT-9085"] }
      ],
      hypotheses: [
        {
          title: "Macro-based delivery continuing over two days",
          likelihood: "Most likely",
          confidence: 58,
          text: "Three execution events on the same host across two days, each with an Office or download parent, point to repeated delivery rather than one-off user error.",
          refs: ["EVT-9085", "EVT-9103"]
        },
        {
          title: "User-enabled script usage",
          likelihood: "Unlikely",
          confidence: 18,
          text: "Hidden and encoded flags are not typical of administrative use, and no helpdesk or change record explains the activity.",
          refs: ["EVT-9118"]
        }
      ],
      recommendations: [
        "Decode the PowerShell payload to recover the second-stage script.",
        "Locate the originating document and check whether it arrived by mail."
      ],
      uncertainty:
        "No mailbox or endpoint mail-trace records are included in the demo dataset, so the delivery mechanism stays unconfirmed."
    }
  };

  /* ======================================================================
     Incident response — recommendations, workflow, audit log
     ====================================================================== */
  var recommendations = [
    {
      id: "REC-1",
      incidentId: "INC-2026-1039",
      title: "Isolate EP-WIN-042 from the network",
      source: "AI recommendation",
      sensitivity: "Sensitive",
      requiresApproval: true,
      status: "Approved",
      rationale:
        "The originating workstation still holds an active C2 channel and an interactive service-account token. Isolation stops further lateral movement while evidence is preserved.",
      evidence: [
        "EVT-9121 — 60-second HTTPS beacon from the affected environment",
        "EVT-9119 — SMB admin-share session to SRV-DB-02",
        "EVT-9120 — credential dumping against LSASS"
      ],
      disclaimer: "Simulated action — no endpoint is actually isolated by this demo interface."
    },
    {
      id: "REC-2",
      incidentId: "INC-2026-1039",
      title: "Block egress to 185.220.101.14 at the perimeter proxy",
      source: "AI recommendation",
      sensitivity: "Sensitive",
      requiresApproval: true,
      status: "Reviewed",
      rationale:
        "The address is the only observed command-and-control endpoint in the record set. Blocking it removes the operator's channel without affecting normal user traffic.",
      evidence: [
        "EVT-9121 — destination 185.220.101.14:443, SNI cdn-static[.]live",
        "Graph edge net-c2 → ep-win042 (sample attack path)"
      ],
      disclaimer: "Simulated action — no firewall or proxy rule is created by this demo interface."
    },
    {
      id: "REC-3",
      incidentId: "INC-2026-1039",
      title: "Reset credentials for CORP\\svc-backup and revoke its sessions",
      source: "AI recommendation",
      sensitivity: "Sensitive",
      requiresApproval: true,
      status: "Proposed",
      rationale:
        "The service account was used interactively from a workstation, which is outside its intended use, and it owns shares on both affected servers.",
      evidence: ["EVT-9108 — service token used interactively", "EVT-9110 — same account read the bait share"],
      disclaimer: "Simulated action — no directory object is modified by this demo interface."
    },
    {
      id: "REC-4",
      incidentId: "INC-2026-1039",
      title: "Collect a memory image from EP-WIN-042",
      source: "Analyst recommendation",
      sensitivity: "Standard",
      requiresApproval: false,
      status: "Proposed",
      rationale:
        "Memory captures retain injected code and ticket material that disk artefacts cannot, while the host is already isolated.",
      evidence: ["EVT-9120 — unsigned process reading LSASS"],
      disclaimer: "Simulated action — evidence collection is not triggered by this demo interface."
    },
    {
      id: "REC-5",
      incidentId: "INC-2026-1039",
      title: "Validate the 06 Oct backup set before restoration",
      source: "Analyst recommendation",
      sensitivity: "Standard",
      requiresApproval: false,
      status: "Reviewed",
      rationale:
        "Shadow-copy deletion was attempted, so recovery confidence depends on an independent, pre-incident backup.",
      evidence: ["EVT-9124 — vssadmin delete shadows /all attempted at 14:48"],
      disclaimer: "Simulated action — no restore job is started by this demo interface."
    },
    {
      id: "REC-6",
      incidentId: "INC-2026-1042",
      title: "Require step-up MFA on legacy authentication protocols",
      source: "AI recommendation",
      sensitivity: "Sensitive",
      requiresApproval: true,
      status: "Proposed",
      rationale:
        "The successful sign-in carried no MFA claim, and a related record shows legacy protocol usage in the same tenant.",
      evidence: ["EVT-9116 — mfa=not-challenged on the successful session", "EVT-9098 — ActiveSync authentication recorded"],
      disclaimer: "Simulated action — no identity-provider policy is changed by this demo interface."
    },
    {
      id: "REC-7",
      incidentId: "INC-2026-1042",
      title: "Rate-limit source ASN 204745 at the web application firewall",
      source: "Analyst recommendation",
      sensitivity: "Standard",
      requiresApproval: false,
      status: "Proposed",
      rationale: "The source produced 412 failures in six minutes; throttling reduces the success odds of continued stuffing.",
      evidence: ["EVT-9115 — 412 failures in six minutes from one address"],
      disclaimer: "Simulated action — no firewall rule is created by this demo interface."
    }
  ];

  var workflow = [
    { id: "detect", title: "Detection", desc: "Rule STUFFING-01 / EDR correlation fired on sample data.", state: "done" },
    { id: "triage", title: "Triage & assignment", desc: "Severity confirmed, owner assigned.", state: "done" },
    { id: "investigate", title: "Investigation", desc: "Evidence, timeline and AI sample analysis reviewed.", state: "done" },
    { id: "approve", title: "Human approval", desc: "Sensitive actions require explicit analyst approval.", state: "current" },
    { id: "execute", title: "Simulated execution", desc: "Approved actions are recorded only — nothing runs.", state: "todo" },
    { id: "validate", title: "Validation & close", desc: "Confirm containment, then resolve the incident.", state: "todo" }
  ];

  var audit = [
    { ts: t("2026-10-09T15:12:00"), actor: "A. Iyer", action: "Approved", target: "REC-1 · Isolate EP-WIN-042", result: "Simulated — recorded locally", incident: "INC-2026-1039" },
    { ts: t("2026-10-09T15:06:00"), actor: "A. Iyer", action: "Marked reviewed", target: "REC-5 · Validate backup set", result: "Recorded locally", incident: "INC-2026-1039" },
    { ts: t("2026-10-09T14:26:00"), actor: "System (demo)", action: "Generated", target: "Sample AI analysis", result: "Demo record, not a live model", incident: "INC-2026-1039" },
    { ts: t("2026-10-09T14:15:00"), actor: "System (demo)", action: "Opened incident", target: "INC-2026-1039", result: "Created from demo detection", incident: "INC-2026-1039" },
    { ts: t("2026-10-09T13:51:00"), actor: "System (demo)", action: "Opened incident", target: "INC-2026-1042", result: "Created from demo detection", incident: "INC-2026-1042" }
  ];

  SOC.demo.graph = { nodes: nodes, edges: edges, attackPath: attackPath };
  SOC.demo.hunting = { saved: savedQueries, history: queryHistory };
  SOC.demo.decoys = decoys;
  SOC.demo.deceptionTimeline = deceptionTimeline;
  SOC.demo.ai = ai;
  SOC.demo.response = {
    recommendations: recommendations,
    workflow: workflow,
    audit: audit
  };
})();
