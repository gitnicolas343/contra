const SUPABASE_URL = "https://ndsyaetglshulaqadvzl.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kc3lhZXRnbHNodWxhcWFkdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mzk0NzEsImV4cCI6MjA4MDAxNTQ3MX0.Z2URIwgvLfpV6fdOv_fgIS-X-es2Zvlwq7QnB1Oo0Js";

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: true },
    });

    const msg = document.getElementById("msg");
    const successMsg = document.getElementById("successMsg");

    document.getElementById("btnSave").onclick = async () => {
      const p = document.getElementById("newPass").value || "";
      if (p.length < 6) {
        msg.textContent = "La contraseña debe tener al menos 6 caracteres.";
        msg.style.display = "block";
        successMsg.style.display = "none";
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({ password: p });

      if (error) {
        msg.textContent = "Error: " + error.message;
        msg.style.display = "block";
        successMsg.style.display = "none";
        return;
      }

      msg.style.display = "none";
      successMsg.style.display = "block";
      setTimeout(() => window.location.href = "/static/login.html", 2000);
    };
