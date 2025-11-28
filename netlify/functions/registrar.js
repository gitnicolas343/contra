// netlify/functions/registrar.js

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  // Solo permitir POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  // Leer Supabase desde variables de entorno
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // service_role (no la anon key)
  );

  try {
    const body = JSON.parse(event.body);
    const { email, password } = body;

    // Validaciones básicas
    if (!email || !email.includes("@")) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Correo inválido" }),
      };
    }

    if (!password || password.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "La contraseña debe tener al menos 6 caracteres"
        }),
      };
    }

    // 1️⃣ Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          ok: false,
          error: "Este correo ya está registrado"
        }),
      };
    }

    // 2️⃣ Crear el nuevo usuario en Supabase
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          email,
          password,            // Puedes añadir hashing más adelante
          login_provider: "email"
        }
      ])
      .select()
      .single();

    if (error) {
      console.log("ERROR SUPABASE:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: error.message }),
      };
    }

    // 3️⃣ Devolver el ID del usuario para almacenarlo en localStorage
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: data.id,
      }),
    };
  } catch (err) {
    console.log("ERROR BACKEND:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Error interno del servidor" }),
    };
  }
};
