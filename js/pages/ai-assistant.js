/* ==========================================================================
   Mini-SOC · pages/ai-assistant.js — AI Assistant page controller (Page L)
   Mounts the shared chat view (SOC.chatUI) into the page shell and wires the
   header controls. All chat behaviour lives in js/chat-ui.js + js/chat-service.js;
   this controller only binds the page.
   ========================================================================== */
(function () {
  "use strict";

  SOC.registerPage("ai-assistant", function () {
    var mount = document.getElementById("aa-chat-mount");
    var chip = document.getElementById("aa-mode-chip");
    var newBtn = document.getElementById("aa-new-btn");
    var historyBtn = document.getElementById("aa-history-btn");
    if (!mount) return;

    function modeLabel(mode) {
      return mode === "soc" ? "Mode: SOC Analyst" : "Mode: General Assistant";
    }

    var view = SOC.chatUI.createView(mount, {
      context: SOC.chatUI.detectContext(),
      historyBtn: historyBtn,
      onModeChange: function (mode) {
        if (chip) chip.textContent = modeLabel(mode);
      }
    });

    if (newBtn) {
      newBtn.addEventListener("click", function () {
        view.newConversation();
      });
    }
  });
})();
