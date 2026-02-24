const { supabase } = require("../supabase/client");

module.exports = function requireAuth(requiredRole = null) {
  return async function (req, res, next) {
    const token = req.cookies.sb_token;

    if (!token) {
      return res.redirect("/login");
    }

    // 1️⃣ Verify JWT
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      res.clearCookie("sb_token");
      return res.redirect("/login");
    }

    const user = authData.user;

    // 2️⃣ Fetch profile (role)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      //return res.status(403).send("Profile not found");
      return res.redirect("/login");
    }

    // 3️⃣ Role check (if required)
    if (requiredRole && profile.role !== requiredRole) {
      return res.status(403).send("Access denied");
    }

    // 4️⃣ Attach trusted user context
    req.user = user;
    req.user.role = profile.role;

    next();
  };
};
