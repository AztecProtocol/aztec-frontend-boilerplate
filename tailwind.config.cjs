module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
  
    // add daisyUI plugin
    plugins: [require("daisyui")],
    theme: {
        extend: {},
      },
  
    // daisyUI config (optional)
    daisyui: {
      styled: true,
      themes: true,
      base: true,
      utils: true,
      logs: true,
      rtl: false,
      prefix: "",
      darkTheme: "dark",
    },
  }