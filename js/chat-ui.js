/* ==========================================================================
   Mini-SOC · chat-ui.js — AI Assistant presentation layer
   --------------------------------------------------------------------------
   SOC.chatUI builds and draws; SOC.chat (chat-service.js) owns state and the
   provider. Two hosts reuse the same view factory:

     • the full page          — pages/ai-assistant.html mounts createView()
     • the contextual drawer  — SOC.chatUI.openDrawer(), reachable from the
                                topbar button on every page. The drawer
                                auto-detects page context (incident / alert /
                                page) from the URL and shows it as removable
                                chips.

   Safety rules honoured here:
     • user input renders as text only (textContent), never HTML;
     • assistant output is treated as untrusted: escaped first, then a small
       whitelist markdown-lite transformation is applied (renderRich);
     • all ids are generated per-view (no duplicate ids across hosts);
     • every listener lives on view-owned nodes or is unsubscribed in
       destroy() — no leaked/duplicate document listeners.
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  var util = SOC.util;
  var el = util.el;

  var SUGGESTIONS = [
    "Explain this security alert",
    "Investigate suspicious login attempts",
    "Summarize recent incidents",
    "Explain a MITRE ATT&CK technique"
  ];

  /* ======================================================================
     Safe markdown-lite renderer
     1. strip control chars, 2. escape everything, 3. apply a whitelist of
     transformations (code fences, headings-as-strong-paragraphs, lists,
     quotes, bold/italic/inline-code, http(s) links only).
     ====================================================================== */
  function inlineFormat(str) {
    var codes = [];
    var s = String(str).replace(/`([^`]+)`/g, function (m, c) {
      codes.push("<code>" + c + "</code>");
      return "\u0001" + (codes.length - 1) + "\u0001";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer nofollow">' + label + "</a>";
    });
    s = s.replace(/\u0001(\d+)\u0001/g, function (m, i) {
      return codes[Number(i)] || "";
    });
    return s;
  }

  function renderRich(src) {
    var text = String(src === null || src === undefined ? "" : src)
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "") // control chars (incl. token markers)
      .replace(/\r\n?/g, "\n");
    text = util.esc(text);

    var stash = [];
    function keep(html) {
      stash.push(html);
      return "\u0000" + (stash.length - 1) + "\u0000";
    }

    /* Fenced code blocks (content is already escaped). */
    text = text.replace(/```[a-zA-Z0-9-]*\n([\s\S]*?)```/g, function (m, code) {
      return keep('<pre class="chat-code"><code>' + code.replace(/\n+$/, "") + "</code></pre>");
    });
    text = text.replace(/```([^\n]*?)```/g, function (m, code) {
      return keep('<pre class="chat-code"><code>' + code + "</code></pre>");
    });

    var out = text
      .split(/\n{2,}/)
      .map(function (block) {
        var trimmed = block.replace(/(?:^\n+|\n+$)/g, "");
        if (!trimmed) return "";
        if (/^\u0000\d+\u0000$/.test(trimmed)) return trimmed; // pure code block
        var lines = trimmed.split("\n");
        var bullet = /^\s*[-•]\s+/;
        var numbered = /^\s*\d+[.)]\s+/;
        var quote = /^\s*&gt;\s?/;
        var parts = [];
        var listTag = null; // "ul" | "ol" | null
        var quoting = false;

        function flushList() {
          if (listTag) {
            parts.push("</" + listTag + ">");
            listTag = null;
          }
        }
        function flushQuote() {
          if (quoting) {
            parts.push("</blockquote>");
            quoting = false;
          }
        }
        function openList(tag) {
          if (listTag === tag) return;
          flushList();
          parts.push("<" + tag + ">");
          listTag = tag;
        }
        function openQuote() {
          if (quoting) return;
          flushList();
          parts.push('<blockquote class="chat-quote">');
          quoting = true;
        }

        lines.forEach(function (line) {
          if (bullet.test(line)) {
            openList("ul");
            parts.push("<li>" + inlineFormat(line.replace(bullet, "")) + "</li>");
          } else if (numbered.test(line)) {
            openList("ol");
            parts.push("<li>" + inlineFormat(line.replace(numbered, "")) + "</li>");
          } else if (/^#{1,6}\s+/.test(line)) {
            flushList();
            flushQuote();
            parts.push('<p class="chat-h">' + inlineFormat(line.replace(/^#{1,6}\s+/, "")) + "</p>");
          } else if (quote.test(line)) {
            var atQuoteStart = !quoting;
            openQuote();
            parts.push((atQuoteStart ? "" : "<br>") + inlineFormat(line.replace(quote, "")));
          } else {
            flushList();
            flushQuote();
            parts.push("<p>" + inlineFormat(line) + "</p>");
          }
        });
        flushList();
        flushQuote();
        return parts.join("");
      })
      .join("");

    return out.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return stash[Number(i)] || "";
    });
  }

  /* ======================================================================
     Context detection — what the current Mini-SOC page can attach
     ====================================================================== */
  function detectContext() {
    var ctx = [];
    var pageKey = (document.body && document.body.dataset.page) || "overview";
    var p = util.params();
    var recordPages = ["investigation", "ai-analyst", "incident-response"];
    var incident = p.get("incident") || (recordPages.indexOf(pageKey) >= 0 ? p.get("id") : null);
    var alert = p.get("event") || p.get("alert");
    if (incident) {
      ctx.push({ type: "incident", id: incident, label: "Workspace context: Incident " + incident });
    } else if (alert) {
      ctx.push({ type: "alert", id: alert, label: "Workspace context: Alert " + alert });
    }
    var meta = (SOC.nav && SOC.nav.pageTitle && SOC.nav.pageTitle(pageKey)) || null;
    ctx.push({ type: "page", id: pageKey, label: "Page: " + (meta && meta.title ? meta.title : pageKey) });
    return ctx;
  }

  /* ======================================================================
     Clipboard helper
     ====================================================================== */
  function copyText(text) {
    function done(ok) {
      SOC.ui.toast(ok ? "Response copied to clipboard." : "Copy failed — select the text manually.", {
        tone: ok ? "success" : "danger"
      });
    }
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok);
      } catch (e) {
        done(false);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true);
        },
        fallback
      );
    } else {
      fallback();
    }
  }

  /* ======================================================================
     View factory
       createView(mount, opts)
         opts.context      — initial context list (default: detectContext())
         opts.historyBtn   — trigger button for the history popover (page)
         opts.newBtn       — "New conversation" button (page)
         opts.onModeChange — callback(mode) for external mode indicators
         opts.compact      — drawer layout tweaks
       returns { root, destroy, submit, newConversation, focusComposer,
                 setContext, getContext, toggleHistory }
     ====================================================================== */
  function createView(mount, opts) {
    opts = opts || {};
    var chat = SOC.chat;
    var ui = SOC.ui;
    var icon = ui.icon;
    var uid = util.uid("chat");
    var context = (opts.context || detectContext()).slice();
    var stickToBottom = true;
    var destroyed = false;
    var unsub = null;
    var onDocKey = null;
    var onDocDown = null;

    var rendered = { convoId: null, count: 0 };
    var lastAnnounced = 0;

    /* ---------- DOM skeleton ---------- */
    var root = el("div", { class: "chat-root" + (opts.compact ? " is-compact" : "") });

    var modeBar = el("div", { class: "chat-modes", role: "group", "aria-label": "Assistant mode" });
    var modeButtons = {};
    ["general", "soc"].forEach(function (mode) {
      var isSoc = mode === "soc";
      var btn = el(
        "button",
        {
          class: "chat-mode",
          type: "button",
          dataset: { mode: mode },
          "aria-pressed": "false",
          onclick: function () {
            chat.setMode(mode);
          }
        },
        el("span", { class: "cm-ico", "aria-hidden": "true", html: icon(isSoc ? "shield" : "user") }),
        el("span", { class: "cm-text" },
          el("span", { class: "cm-label", text: isSoc ? "SOC Analyst" : "General Assistant" }),
          el("span", { class: "cm-desc", text: isSoc ? "Investigate security events and incidents" : "Cybersecurity knowledge and guidance" })
        )
      );
      modeButtons[mode] = btn;
      modeBar.appendChild(btn);
    });
    modeBar.appendChild(
      el("span", {
        class: "chat-provider",
        title:
          "Replies are scripted sample content generated locally in this browser. No AI model, backend or API key is involved.",
        html: icon("info") + "<span>" + util.esc(chat.CONFIG.providerLabel) + " · no live model</span>"
      })
    );
    root.appendChild(modeBar);

    var contextRow = el("div", { class: "chat-context", hidden: true });
    root.appendChild(contextRow);

    var scroller = el("div", { class: "chat-scroll" });
    var log = el("div", { class: "chat-log", role: "log", "aria-label": "Conversation transcript" });
    scroller.appendChild(log);
    root.appendChild(scroller);

    var jumpBtn = el("button", {
      class: "chat-jump",
      type: "button",
      hidden: true,
      text: "Jump to latest",
      onclick: function () {
        stickToBottom = true;
        scrollToBottom();
        jumpBtn.hidden = true;
      }
    });
    root.appendChild(jumpBtn);

    var liveRegion = el("div", { class: "sr-only", id: uid + "-live", role: "status", "aria-live": "polite" });

    var taId = uid + "-input";
    var ta = el("textarea", {
      id: taId,
      class: "chat-ta",
      rows: "1",
      placeholder: "Ask a security question...",
      maxlength: String(chat.CONFIG.maxMessageChars),
      "aria-label": "Message the AI assistant"
    });
    var sendBtn = el("button", {
      class: "icon-btn chat-send",
      type: "submit",
      "aria-label": "Send message",
      disabled: true,
      html: icon("send")
    });
    var form = el("form", { class: "chat-composer", novalidate: true });
    form.appendChild(el("div", { class: "chat-ta-wrap" }, ta, sendBtn));
    root.appendChild(form);

    var hint = el("p", {
      class: "chat-hint xsmall subtle",
      html: "<b>Demo provider</b> — replies are scripted samples. Enter sends · Shift+Enter adds a line."
    });
    root.appendChild(hint);
    root.appendChild(liveRegion);

    /* Typing indicator stays the log's last child. */
    var typingNode = el(
      "div",
      { class: "chat-msg chat-msg-bot is-typing", hidden: true, "aria-hidden": "true" },
      el("div", { class: "chat-ava", "aria-hidden": "true", html: icon("ai") }),
      el("div", { class: "chat-bubble" },
        el("div", { class: "chat-typing" },
          el("span", { class: "dot" }),
          el("span", { class: "dot" }),
          el("span", { class: "dot" }),
          el("span", { class: "sr-only", text: "Assistant is responding" })
        )
      )
    );

    /* ---------- History popover (disclosure pattern) ---------- */
    var pop = null;
    var popTrigger = opts.historyBtn || null;
    if (popTrigger) {
      pop = el("div", { class: "popover chat-hpop", id: uid + "-history", hidden: true });
      popTrigger.setAttribute("aria-expanded", "false");
      popTrigger.setAttribute("aria-controls", pop.id);
    }

    /* ---------- Message rendering ---------- */
    function demoChip() {
      return el("span", {
        class: "chat-demo-chip",
        title: "Scripted sample response from the local demo knowledge base — no AI model is connected.",
        text: "Demo"
      });
    }

    function footerFor(msg) {
      var foot = el("div", { class: "chat-foot" });
      if (msg.role !== "user" && !msg.code) {
        foot.appendChild(demoChip());
        foot.appendChild(
          el("button", {
            class: "btn btn-ghost chat-copy",
            type: "button",
            "aria-label": "Copy assistant response",
            text: "Copy",
            onclick: function () {
              copyText(msg.text);
            }
          })
        );
      }
      if (msg.code === "failed" || msg.code === "empty") {
        foot.appendChild(
          el("button", {
            class: "btn chat-retry",
            type: "button",
            "aria-label": "Retry the last message",
            html: icon("refresh") + "<span>Retry</span>",
            onclick: function () {
              if (chat.isPending()) {
                showHintError("The assistant is still responding — wait for the reply or retry then.");
                return;
              }
              chat.retry();
            }
          })
        );
      }
      return foot.childNodes.length ? foot : null;
    }

    function msgNode(msg) {
      var isUser = msg.role === "user";
      var article = el("article", {
        class: "chat-msg " + (isUser ? "chat-msg-user" : "chat-msg-bot") + (msg.code === "failed" ? " is-error" : "")
      });
      article.appendChild(el("div", { class: "chat-ava", "aria-hidden": "true", html: icon(isUser ? "user" : "ai") }));

      var bubble = el("div", { class: "chat-bubble" });
      bubble.appendChild(
        el("div", { class: "chat-meta" },
          el("span", { class: "chat-who", text: isUser ? "You" : "Assistant" }),
          el("time", {
            class: "chat-time",
            datetime: new Date(msg.ts).toISOString(),
            text: util.fmtTime(msg.ts)
          })
        )
      );

      if (isUser) {
        /* User content is NEVER parsed as markup. */
        bubble.appendChild(el("div", { class: "chat-body", text: msg.text }));
      } else if (msg.code === "failed") {
        bubble.appendChild(
          el("div", { class: "chat-error" },
            el("span", { "aria-hidden": "true", html: icon("warning") }),
            el("div", {},
              el("b", { text: "Could not answer." }),
              el("span", { class: "subtle", text: " " + msg.text })
            )
          )
        );
      } else if (msg.code === "empty") {
        bubble.appendChild(
          el("div", { class: "chat-error" },
            el("span", { "aria-hidden": "true", html: icon("info") }),
            el("div", {},
              el("b", { text: "The provider returned no content." }),
              el("span", { class: "subtle", text: " An empty response is shown honestly instead of faking an answer." })
            )
          )
        );
      } else {
        /* Assistant output: escaped + whitelist formatting (treated as untrusted). */
        bubble.appendChild(el("div", { class: "chat-body", html: renderRich(msg.text) }));
      }

      var foot = footerFor(msg);
      if (foot) bubble.appendChild(foot);
      article.appendChild(bubble);
      return article;
    }

    function welcomeNode() {
      return el("div", { class: "chat-welcome" },
        el("div", { class: "chat-welcome-ico", "aria-hidden": "true", html: icon("ai") }),
        el("p", {
          class: "chat-welcome-text",
          text:
            "Hello, analyst. I can help you understand cybersecurity concepts or investigate evidence available in your Mini-SOC workspace."
        }),
        el("div", { class: "chat-suggests", role: "group", "aria-label": "Suggested prompts" },
          SUGGESTIONS.map(function (s) {
            return el("button", {
              class: "chat-suggest",
              type: "button",
              text: s,
              onclick: function () {
                submit(s);
              }
            });
          })
        ),
        el("p", { class: "subtle xsmall", text: "Demo assistant — every reply is a scripted sample generated in this browser." })
      );
    }

    /* ---------- Scroll behaviour ---------- */
    function nearBottom() {
      return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
    }
    function scrollToBottom() {
      scroller.scrollTop = scroller.scrollHeight;
    }
    function onScroll() {
      stickToBottom = nearBottom();
      jumpBtn.hidden = stickToBottom;
    }
    scroller.addEventListener("scroll", onScroll);

    /* ---------- Composer ---------- */
    var MAX_TA_HEIGHT = 168;
    function autogrow() {
      ta.style.height = "auto";
      var h = Math.min(ta.scrollHeight, MAX_TA_HEIGHT);
      ta.style.height = h + "px";
      ta.style.overflowY = ta.scrollHeight > MAX_TA_HEIGHT ? "auto" : "hidden";
    }
    function updateSendState() {
      sendBtn.disabled = !ta.value.trim() || chat.isPending();
    }
    function announce(text) {
      liveRegion.textContent = text;
    }
    function showHintError(message) {
      hint.classList.add("is-error");
      hint.textContent = message;
      announce(message);
    }
    function clearHintError() {
      if (!hint.classList.contains("is-error")) return;
      hint.classList.remove("is-error");
      hint.innerHTML = "<b>Demo provider</b> — replies are scripted samples. Enter sends · Shift+Enter adds a line.";
    }

    function submit(text) {
      if (destroyed) return;
      var trimmed = String(text === null || text === undefined ? "" : text).trim();
      if (!trimmed) {
        showHintError("Type a message before sending.");
        return;
      }
      if (chat.isPending()) {
        showHintError("The assistant is still responding — wait for the reply, then retry if it failed.");
        return;
      }
      clearHintError();
      if (text === ta.value) ta.value = ""; // submitted from the box → clear it
      autogrow();
      updateSendState();
      stickToBottom = true;
      chat.send(trimmed, context.slice()).then(function (result) {
        if (destroyed) return;
        if (result && (result.code === "invalid" || result.code === "busy")) {
          showHintError(result.message || "The message could not be sent.");
          ta.value = text; // give the text back so nothing is lost
          autogrow();
          updateSendState();
        }
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submit(ta.value);
    });
    ta.addEventListener("input", function () {
      clearHintError();
      autogrow();
      updateSendState();
    });
    ta.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (event.isComposing || event.keyCode === 229) return; // IME composition
      event.preventDefault();
      submit(ta.value);
    });

    /* ---------- Context row ---------- */
    function hasRecordContext() {
      return context.some(function (c) {
        return c.type === "incident" || c.type === "alert";
      });
    }
    function removeContext(target) {
      context = context.filter(function (c) {
        return c !== target;
      });
      renderContext();
      announce("Context removed.");
    }
    function renderContext() {
      contextRow.innerHTML = "";
      var showNote = chat.getMode() === "soc" && !hasRecordContext();
      if (!context.length && !showNote) {
        contextRow.hidden = true;
        return;
      }
      contextRow.hidden = false;
      var chips = el("div", { class: "chat-ctx-chips" });
      context.forEach(function (c) {
        chips.appendChild(
          el("span", { class: "chat-ctx-chip" + (c.type === "page" ? " is-page" : "") },
            el("span", { "aria-hidden": "true", html: icon(c.type === "page" ? "layers" : c.type === "alert" ? "events" : "incidents") }),
            el("span", { text: c.label }),
            el("button", {
              class: "chat-ctx-x",
              type: "button",
              "aria-label": "Remove context: " + c.label,
              html: icon("close"),
              onclick: function () {
                removeContext(c);
              }
            })
          )
        );
      });
      contextRow.appendChild(chips);
      if (showNote) {
        contextRow.appendChild(
          el("p", {
            class: "chat-ctx-empty xsmall subtle",
            text:
              "No record-level context attached. I can analyse your system data once the backend integration is configured — until then, answers come from the demo knowledge base."
          })
        );
      }
    }

    /* ---------- Log sync (incremental so role=log announces additions) ---------- */
    function resetLog() {
      log.innerHTML = "";
      log.appendChild(typingNode); // keep the indicator as the log's last child
      rendered.count = 0;
    }
    function syncLog() {
      if (destroyed) return;
      var convo = chat.getActiveConversation();
      var convoId = convo ? convo.id : chat.NEW;
      if (rendered.convoId !== convoId) {
        resetLog();
        rendered.convoId = convoId;
      }
      var msgs = convo ? convo.messages : [];
      if (msgs.length < rendered.count) {
        resetLog();
      }
      var welcome = log.querySelector(".chat-welcome");
      if (!msgs.length && !welcome) log.insertBefore(welcomeNode(), typingNode);
      if (msgs.length && welcome) welcome.parentNode.removeChild(welcome);
      for (var i = rendered.count; i < msgs.length; i++) {
        log.insertBefore(msgNode(msgs[i]), typingNode);
      }
      rendered.count = msgs.length;
      typingNode.hidden = !chat.isPending();
      if (stickToBottom) scrollToBottom();
    }

    /* ---------- History popover ---------- */
    function closeHistory(refocus) {
      if (!pop || pop.hidden) return;
      pop.hidden = true;
      popTrigger.setAttribute("aria-expanded", "false");
      if (onDocKey) document.removeEventListener("keydown", onDocKey, true);
      if (onDocDown) document.removeEventListener("mousedown", onDocDown, true);
      onDocKey = onDocDown = null;
      if (refocus) popTrigger.focus();
    }

    function renderHistory() {
      pop.innerHTML = "";
      var list = chat.listConversations();
      pop.appendChild(
        el("div", { class: "chat-hpop-head" },
          el("b", { text: "Conversations" }),
          el("span", { class: "subtle xsmall", text: list.length ? list.length + " saved locally" : "none yet" })
        )
      );
      if (!list.length) {
        pop.appendChild(
          el("p", {
            class: "chat-hempty subtle xsmall",
            text: "No conversations yet. Conversations are stored only in this browser — never real security data."
          })
        );
        return;
      }
      var ul = el("ul", { class: "chat-hlist" });
      list.forEach(function (c) {
        var isActive = c.id === chat.getState().activeId;
        var last = c.messages[c.messages.length - 1];
        var item = el("button", {
          class: "chat-hitem" + (isActive ? " is-active" : ""),
          type: "button",
          "aria-current": isActive ? "true" : null,
          onclick: function () {
            chat.selectConversation(c.id);
            closeHistory(false);
          }
        },
          el("span", { class: "chi-title", text: c.title }),
          el("span", {
            class: "chi-meta subtle xsmall",
            text:
              c.messages.length +
              " message" + (c.messages.length === 1 ? "" : "s") +
              " · " + (c.mode === "soc" ? "SOC Analyst" : "General") +
              " · " + util.relTime(last ? last.ts : c.created)
          })
        );
        ul.appendChild(
          el("li", {},
            item,
            el("button", {
              class: "icon-btn chat-hdel",
              type: "button",
              "aria-label": "Delete conversation: " + c.title,
              html: icon("trash"),
              onclick: function (event) {
                event.stopPropagation();
                closeHistory(false);
                SOC.ui.confirm({
                  title: "Delete conversation?",
                  message: "“" + c.title + "” and its messages will be removed from this browser.",
                  detail: "Demo conversations only — this cannot affect any real data.",
                  confirmLabel: "Delete",
                  danger: true
                }).then(function (ok) {
                  if (!ok) return;
                  chat.deleteConversation(c.id);
                  SOC.ui.toast("Conversation deleted.", { tone: "success" });
                });
              }
            })
          )
        );
      });
      pop.appendChild(ul);
    }

    function openHistory() {
      renderHistory();
      pop.hidden = false;
      popTrigger.setAttribute("aria-expanded", "true");
      var first = pop.querySelector(".chat-hitem");
      if (first) first.focus();
      onDocKey = function (event) {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeHistory(true);
        }
      };
      onDocDown = function (event) {
        if (pop.hidden) return;
        if (pop.contains(event.target) || popTrigger.contains(event.target)) return;
        closeHistory(false);
      };
      document.addEventListener("keydown", onDocKey, true);
      document.addEventListener("mousedown", onDocDown, true);
    }

    function toggleHistory(force) {
      if (!pop) return;
      var open = typeof force === "boolean" ? force : pop.hidden;
      if (open) openHistory();
      else closeHistory(true);
    }
    if (popTrigger) {
      popTrigger.addEventListener("click", function () {
        toggleHistory();
      });
      document.body.appendChild(pop); // positioned via CSS under .popover-host
    }

    /* ---------- Store subscription ---------- */
    function onStoreChange(payload) {
      if (destroyed) return;
      var reason = payload && payload.reason;
      if (reason === "user-message") announce("Message sent. Assistant is responding…");
      if (reason === "retry") announce("Retrying the last message…");
      if (reason === "reply") {
        var convo = chat.getActiveConversation();
        if (convo && convo.messages.length > lastAnnounced) {
          announce("New reply from Assistant.");
        }
        lastAnnounced = convo ? convo.messages.length : 0;
      }
      if (reason === "new-conversation") announce("New conversation started.");
      if (reason === "delete-conversation") announce("Conversation deleted.");
      if (reason === "mode-change") {
        announce(chat.getMode() === "soc" ? "Switched to SOC Analyst mode." : "Switched to General Assistant mode.");
      }
      renderModes();
      renderContext();
      syncLog();
      updateSendState();
      if (pop && !pop.hidden) renderHistory();
    }
    unsub = chat.subscribe(onStoreChange);

    /* ---------- Modes ---------- */
    function renderModes() {
      var mode = chat.getMode();
      Object.keys(modeButtons).forEach(function (key) {
        var active = key === mode;
        modeButtons[key].setAttribute("aria-pressed", active ? "true" : "false");
        modeButtons[key].classList.toggle("is-active", active);
      });
      if (opts.onModeChange) opts.onModeChange(mode);
    }

    /* ---------- Public API ---------- */
    function newConversation() {
      chat.newConversation();
      focusComposer();
    }
    function focusComposer() {
      ta.focus();
    }
    function destroy() {
      destroyed = true;
      if (unsub) unsub();
      closeHistory(false);
      if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    }

    /* ---------- First paint ---------- */
    lastAnnounced = chat.getActiveConversation() ? chat.getActiveConversation().messages.length : 0;
    renderModes();
    renderContext();
    log.appendChild(typingNode);
    syncLog();
    autogrow();
    updateSendState();

    mount.appendChild(root);

    return {
      root: root,
      destroy: destroy,
      submit: submit,
      newConversation: newConversation,
      focusComposer: focusComposer,
      setContext: function (list) {
        context = Array.isArray(list) ? list.slice() : [];
        renderContext();
      },
      getContext: function () {
        return context.slice();
      },
      toggleHistory: toggleHistory
    };
  }

  /* ======================================================================
     Contextual drawer — one instance at a time, shared store with the page
     ====================================================================== */
  var drawer = { view: null };

  function openDrawer() {
    if (drawer.view) {
      drawer.view.focusComposer();
      return;
    }
    var mount = el("div", { class: "chat-drawer-mount" });
    var view = createView(mount, { compact: true, context: detectContext() });
    drawer.view = view;
    SOC.ui.openDrawer({
      title: "AI Security Assistant",
      subtitle: "Demo provider · no live model connected — scripted sample replies",
      ariaLabel: "AI Security Assistant",
      body: mount,
      onOpen: function (panel) {
        var body = panel.querySelector(".drawer-body");
        if (body) body.classList.add("chat-drawer-body");
        // Land focus in the composer (the overlay's default would hit the
        // mode buttons first, since they precede the textarea in DOM order).
        var composer = panel.querySelector(".chat-ta");
        if (composer && composer.focus) composer.focus();
      },
      onClose: function () {
        if (drawer.view) {
          drawer.view.destroy();
          drawer.view = null;
        }
      }
    });
  }

  function closeDrawer() {
    /* The shared overlay machine closes on Esc/scrim/close-button; this hook
       exists for symmetry and future bindings. */
    if (drawer.view) {
      drawer.view.destroy();
      drawer.view = null;
    }
  }

  SOC.chatUI = {
    createView: createView,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    detectContext: detectContext,
    renderRich: renderRich // exported for tests
  };
})();
