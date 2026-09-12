import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [captcha, setCaptcha] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const captchaCode = "A7K9P";

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");

        if (!email || !password || !captcha) {
            setError("Please fill in all fields.");
            return;
        }

        if (captcha.toUpperCase() !== captchaCode) {
            setError("Invalid CAPTCHA.");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                "http://localhost:5000/api/auth/login",
                {
                    email,
                    password
                }
            );

            localStorage.setItem(
                "token",
                response.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            navigate("/dashboard");

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Login failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                <div className="text-center mb-8">

                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                            G
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800">
                        GeM Bid Compliance
                    </h1>

                    <p className="text-slate-500 mt-2">
                        AI-Powered Procurement Verification Platform
                    </p>

                </div>

                <form
                    onSubmit={handleLogin}
                    className="space-y-5"
                >

                    {/* Email */}

                    <div>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Official Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your official email"
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />

                    </div>


                    {/* Password */}

                    <div>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Password
                        </label>

                        <div className="relative">

                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Enter your password"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600"
                            >
                                {showPassword
                                    ? "Hide"
                                    : "Show"}
                            </button>

                        </div>

                    </div>


                    {/* CAPTCHA */}

                    <div>

                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            CAPTCHA
                        </label>

                        <div className="flex gap-3">

                            <div className="flex-1 bg-slate-200 rounded-lg flex items-center justify-center font-bold tracking-widest text-lg">
                                {captchaCode}
                            </div>

                            <input
                                type="text"
                                value={captcha}
                                onChange={(e) =>
                                    setCaptcha(e.target.value)
                                }
                                placeholder="Enter CAPTCHA"
                                className="w-1/2 px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />

                        </div>

                    </div>


                    {/* Error */}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}


                    {/* Login Button */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
                    >
                        {loading
                            ? "Signing In..."
                            : "Sign In"}
                    </button>

                </form>


                <div className="mt-8 text-center text-sm text-slate-500">
                    Authorized Procurement Officers Only
                </div>

            </div>

        </div>
    );
}

export default Login;