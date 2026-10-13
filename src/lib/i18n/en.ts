import type { Dictionary } from "./dictionaries";

/** English interface copy. Same keys as pt-br.ts (enforced by `satisfies Dictionary`). */
export const en = {
  common: {
    skipToContent: "Skip to content",
    yes: "Yes",
    no: "No",
    homeAriaLabel: "Niara PMEs — home page",
    comingSoon: "Coming soon",
    demo: "Demo",
    demoNotice:
      "Institutional and demo content. No real investment offering is available at this stage.",
  },
  meta: {
    title: "Niara PMEs",
    description:
      "A platform for small and medium-sized enterprises to structure fundraising and split their capital through tokenization.",
  },
  styleguide: {
    title: "Design system",
    subtitle: "A living reference of the tokens defined in @theme (src/app/globals.css).",
    colorsBase: "Base colors",
    militaryGreen: "Sage green (primary)",
    salmon: "Peach (accent / CTA)",
    accents: "Section accents",
    typography: "Typography",
    radiiAndShadows: "Radii and shadows",
    buttons: "Buttons",
    cards: "Cards",
    alternatingBackgrounds: "Alternating section backgrounds",
    typographySample:
      "Space Grotesk is used for headings (h1–h6); Inter is used for body text, like this paragraph.",
    primaryButton: "Primary button",
    secondaryButton: "Secondary button",
    disabledButton: "Disabled button",
    cardTitle: "Default card",
    cardText: "bg-surface surface on bg-surface-alt, subtle border and soft shadow.",
    sageBackground: "Sage background (military-100), title in ink",
    peachBackground: "Peach background (salmon-100), title in ink, subtitle in ink-peach",
    peachBackgroundSubtitle: "Sample subtitle in ink-peach on a peach background.",
  },
  hero: {
    badge: "A platform for companies",
    title: "Structure your company's fundraising and capital tokenization",
    subtitle:
      "Niara PMEs helps small and medium-sized enterprises organize fundraising rounds and split ownership through tokenization.",
    ctaPrimary: "Start fundraising",
    ctaSecondary: "Learn more",
  },
  sections: {
    benefits: {
      title: "The benefits of tokenization for small and medium-sized enterprises",
      subtitle:
        "Turn part of your company or your assets into digital shares. Raise funds directly from investors and transfer shares more cheaply, 100% online and securely.",
      items: [
        {
          title: "Tax advantage",
          description:
            "Speed up the distribution and trading of corporate tokens and offer succession planning options through smart solutions.",
        },
        {
          title: "Cheaper, fairer credit",
          description:
            "Get away from abusive fees and traditional banks' red tape through peer-to-peer deals managed by the platform.",
        },
        {
          title: "Management on autopilot",
          description:
            "Forget confusing spreadsheets. Our system automatically keeps track of who your investors are and distributes profits, meetings or interest.",
        },
      ],
    },
    howItWorks: {
      title: "How it works",
      subtitle: "A process structured in four steps.",
      steps: [
        {
          title: "Company sign-up",
          description:
            "The company creates an institutional profile on the platform and sends the information needed to structure the offering.",
        },
        {
          title: "Structuring the offering",
          description:
            "Together with the company, we define the fundraising terms: the amount sought, the stake offered and the conditions.",
        },
        {
          title: "Tokenization and registration",
          description:
            "The stakes are represented as tokens, with a record available as an auditable reference.",
        },
        {
          title: "Showcase for investors",
          description:
            "The offering is listed in the platform's showcase, visible to registered investors.",
        },
      ],
    },
    audiences: {
      title: "For companies and for investors",
      companies: {
        title: "For companies",
        items: [
          "Structure fundraising rounds with clarity about the stake and the conditions.",
          "Cut costs and red tape compared to traditional fundraising channels.",
          "Keep an auditable record of the stakes issued.",
        ],
      },
      investors: {
        title: "For investors",
        items: [
          "Browse a showcase of companies that structured offerings on the platform.",
          "See the conditions of each offering before deciding to take part.",
          "Track your holdings in a single place.",
        ],
      },
    },
    whenToUse: {
      title: "When can I use tokenization?",
      items: [
        {
          title: "Opening new branches",
          description: "Fund your store's expansion by sharing future profits with your customers.",
        },
        {
          title: "Cash advance",
          description: "Only getting paid in 90 days? Turn those invoices into cash today.",
        },
        {
          title: "Launching a new product",
          description:
            "Raise capital to get your idea off the ground without going into debt on the company credit card.",
        },
        {
          title: "Want to create a token?",
          description: "We design structures shaped around your idea, if creating a token makes sense.",
        },
      ],
    },
    tokens: {
      title: "Meet the tokens",
      items: [
        {
          title: "SME Token",
          description: "An ownership token for small and medium-sized enterprises.",
          href: "/negociar/token-pmes",
        },
        {
          title: "Auto Token",
          description: "A token focused on the automotive sector.",
          href: "/negociar/token-auto",
        },
        {
          title: "Agro Token",
          description: "A token focused on agribusiness operations and assets.",
          href: "/negociar/token-agro",
        },
        {
          title: "Real Estate Token",
          description: "A token backed by real estate assets.",
          href: "/negociar/token-imobiliario",
        },
      ],
    },
    trustNotice: {
      text: "Niara PMEs is in a development and demo stage. No real investment offering is available at this stage. Future offerings will depend on regulatory authorization from the CVM (Brazil's Securities and Exchange Commission).",
    },
    finalCta: {
      title: "Want to structure your company's fundraising?",
      subtitle:
        "Talk to our team to understand how tokenization can fit into your fundraising process.",
      cta: "Contact us",
    },
  },
  footer: {
    brandDescription:
      "A platform for small and medium-sized enterprises to structure fundraising and split their capital through tokenization.",
    columnTrade: "Trade",
    columnPlatform: "Platform",
    columnAbout: "About",
    footerAriaLabel: "Footer navigation",
    disclaimer:
      "Institutional and demo content. No real investment offering is available at this stage. This site is not a public offering of securities.",
    copyright: "© 2026 Niara PMEs. Demo content.",
  },
  nav: {
    mainAriaLabel: "Main navigation",
    mobileAriaLabel: "Mobile navigation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    signIn: "Sign in",
    language: {
      ariaLabel: "Site language",
      en: "English",
      pt: "Português",
    },
    accountMenu: {
      openMenu: "Open account menu",
      signInOtherAccount: "Sign in with another account",
      signOut: "Sign out",
      signingOut: "Signing out…",
    },
    trade: "Trade",
    assets: "Assets",
    profile: "Profile",
    about: "About",
    tradeChildren: {
      assetsAndTokens: {
        label: "Assets and tokens",
        href: "/negociar/ativos-e-tokens",
        description: "An overview of the asset types tokenized on the platform.",
      },
      smesToken: {
        label: "SME Token",
        href: "/negociar/token-pmes",
        description: "An ownership token for small and medium-sized enterprises.",
      },
      tokenAgro: {
        label: "Agro token",
        href: "/negociar/token-agro",
        description: "A token focused on agribusiness operations and assets.",
      },
      realEstateToken: {
        label: "Real estate token",
        href: "/negociar/token-imobiliario",
        description: "A token backed by real estate assets.",
      },
      tokenAuto: {
        label: "Auto token",
        href: "/negociar/token-auto",
        description: "A token focused on the automotive sector.",
      },
      debtSecurities: {
        label: "Debt securities",
        href: "/negociar/titulos-de-divida",
        description: "Debt instruments structured through tokenization.",
      },
    },
    aboutChildren: {
      documents: {
        label: "Docs and FAQs",
        href: "/sobre/documentos",
        description: "Institutional materials and frequently asked questions.",
      },
      contact: {
        label: "Contact us",
        href: "/sobre/contato",
        description: "Talk to the Niara PMEs team.",
      },
    },
  },
  assets: {
    meta: {
      title: "Assets",
      description: "Your portfolio of tokenized holdings: catalog and positions, as a demo.",
    },
    title: "Assets",
    subtitle: "Your portfolio of tokenized holdings.",
    demoBanner: {
      label: "Demo",
      text: "simulated portfolio and data. It doesn't reflect real positions or values, except for the \"Real position — Sepolia\" card at the top of \"My portfolio\", which reads directly from a real on-chain contract.",
    },
    tabs: {
      wallet: "My portfolio",
      available: "Available assets",
    },
    realPosition: {
      badge: "Real — Sepolia",
      link: "Invest / view details →",
      explanation:
        "Your real position in the demo offering on Sepolia, read directly from the on-chain contract, unlike the rest of this screen (100% simulated).",
      connectPrompt: "Connect your wallet to see your real position in this offering.",
      wrongNetwork: "Switch to the Sepolia network to see your real position.",
      noPosition: "You haven't invested in this demo's real offering yet.",
      invested: "You invested",
      shares: "Your shares (ParticipacaoToken)",
      stateLabel: "Offering state",
    },
    kpis: {
      totalEquity: "Total equity",
      investedValue: "Amount invested",
      profitLoss: "Total profit/loss",
      periodReturn: "Return for the period",
      returnNote: "Last 12 months",
    },
    categories: {
      pmes: "SME Token",
      agro: "Agro Token",
      imobiliario: "Real Estate Token",
      auto: "Auto Token",
      divida: "Debt securities",
    },
    regions: {
      sudeste: "Southeast",
      sul: "South",
      nordeste: "Northeast",
      "centro-oeste": "Center-West",
    },
    evolution: {
      title: "Portfolio evolution",
      investedSeries: "Amount invested",
      gainSeries: "Capital gain",
      description:
        "Chart description: amount invested and accumulated capital gain, month by month, over the last 12 months. The same data appears in the positions table below.",
    },
    allocation: {
      title: "Allocation",
      viewClass: "By class",
      viewAsset: "By asset",
      viewSector: "By sector/region",
    },
    table: {
      title: "Positions",
      colAsset: "Asset",
      colCategory: "Category",
      colShares: "Shares",
      colAveragePrice: "Average price",
      colCurrentValue: "Current value",
      colChange: "Change",
    },
    catalog: {
      title: "Available assets",
      subtitle: "Demo catalog: illustrative holdings, with no real offering available.",
      invest: "Invest",
    },
  },
  profile: {
    meta: {
      title: "Profile",
      description: "Profile area: registration data, offerings, investor profile and wallet.",
    },
    title: "Profile",
    subtitle: "Your registration data, offerings, investor profile and wallet.",
    demoBanner: {
      label: "Demo",
      text: "demo environment, use fictitious data only. The \"Registration data\" fields are really saved to your account, and \"My offerings\" shows your company's real offerings; the \"Investor profile\" section only lasts for this browser session.",
    },
    kyc: {
      notVerified: "Not verified",
      notice:
        "KYC in this demo is approved automatically, with no real verification. Real identity validation will be implemented when the product goes live.",
    },
    badges: {
      profilePrefix: "Profile",
    },
    nav: {
      ariaLabel: "Profile sections",
      registrationData: "Registration data",
      myOfferings: "My offerings",
      investorProfile: "Investor profile",
      wallet: "Wallet",
    },
    registrationData: {
      title: "Registration data",
      personType: {
        legend: "Account type",
        individual: "Individual",
        company: "Company",
      },
      avatar: {
        changeLabel: "Change",
        removeLabel: "Remove",
        selectLabel: "Select an avatar image",
        photoAlt: "Profile photo",
        hint: "JPG or PNG, up to 2MB. The image isn't uploaded; it stays in your browser only.",
        invalidType: "Select an image file (JPG or PNG).",
        tooLarge: "The image must be 2MB or less.",
      },
      companyLogo: {
        title: "Company logo",
        subtitle:
          "The logo is public: it appears on the offering page and on the showcase cards. Unlike the profile photo above, this upload is really saved.",
        logoAlt: "Company logo",
        sendLabel: "Upload logo",
        changeLabel: "Replace",
        removeLabel: "Remove",
        sending: "Uploading…",
        selectLabel: "Select a logo file",
        hint: "JPG, PNG or WebP, up to 2MB. A square image (e.g. 400×400) looks best on the card.",
        invalidType: "Select a JPG, PNG or WebP file.",
        tooLarge: "The image must be 2MB or less.",
        successSent: "Logo uploaded.",
        successRemoved: "Logo removed.",
      },
      companyBanner: {
        title: "Offering banner",
        subtitle:
          "The banner is public: it appears as the cover of your offering's card in /negociar, together with the logo. This upload is really saved.",
        bannerAlt: "Offering banner",
        sendLabel: "Upload banner",
        changeLabel: "Replace",
        removeLabel: "Remove",
        sending: "Uploading…",
        selectLabel: "Select a banner file",
        hint: "JPG, PNG or WebP, up to 3MB. A wide ratio (e.g. 1200×400) looks best on the card.",
        invalidType: "Select a JPG, PNG or WebP file.",
        tooLarge: "The image must be 3MB or less.",
        successSent: "Banner uploaded.",
        successRemoved: "Banner removed.",
      },
      cardPreview: {
        title: "Card preview",
        subtitle:
          "How the banner and the logo look together on your offering's card in /negociar. The crop matches the real one; adjust the images above if it looks off.",
      },
      personalSection: "Personal data",
      publicSection: "Public company data",
      publicSectionNote: "These fields appear on the public offering page, unlike the rest of the registration, which is private.",
      publishCnpj: {
        statusLabel: "CNPJ on the public page",
        label: "Show the CNPJ on my offering (masked)",
        hint: "If checked, the public offering page shows the masked root of the CNPJ (e.g. 12.345.678/****-**). If unchecked, the CNPJ doesn't appear, and it isn't even read from the database for the public page. The other contact details (phone, address, wallet) are never public, with or without this option.",
        showing: "Shown (masked) on the public offering",
        notShowing: "Not shown on the public offering",
      },
      addressSection: "Address",
      fields: {
        country: "Country",
        brazil: "Brazil",
        fullName: "Full name",
        legalName: "Legal name",
        tradeName: "Trade name",
        documentCpf: "CPF",
        documentCnpj: "CNPJ",
        birthDate: "Date of birth",
        email: "Email",
        grossAnnualRevenue: "Gross annual revenue (R$)",
        sector: "Business sector",
        businessSummary: "Business summary",
        phone: "Phone",
        cep: "CEP (postal code)",
        street: "Street",
        number: "Number",
        complement: "Address line 2",
        district: "Neighborhood",
        city: "City",
        state: "State",
        selectState: "Select",
      },
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      edit: "Edit",
      saveNote: "This data is saved to your account. Demo environment: use fictitious data only; no verification (KYC) is done from here.",
      savedConfirmation: "Data saved successfully.",
      notProvided: "Not provided",
      errors: {
        required: "Required field.",
        invalidDocument: "Invalid document.",
        invalidDate: "Invalid date.",
        invalidEmail: "Invalid email.",
        phoneInvalid: "Invalid phone.",
        invalidCep: "Invalid CEP.",
      },
    },
    myOfferings: {
      title: "My offerings",
      subtitle: "A summary of your company's fundraising offerings. Creating, activating and closing them happens in \"My offerings\" (full management).",
      empty: "No offering registered yet.",
      manageButton: "Manage offerings →",
      card: {
        createdOn: "Created on",
        minTarget: "Minimum target",
        cap: "Cap (with additional lot)",
      },
    },
    investor: {
      title: "Investor profile",
      subtitle:
        "Equivalent to the API (Investor Profile Analysis) required by Brazil's CVM. In production, the questionnaire would be mandatory before trading, and sign-up would only be complete after answering it; here, since it's a demo, the rest of the site stays accessible.",
      evaluatedOn: (data: string) => `Evaluated on ${data}`,
      categories: {
        conservador: "Conservative",
        moderado: "Moderate",
        arrojado: "Aggressive",
      },
      quiz: {
        questionCounter: (current: number, total: number) => `Question ${current} of ${total}`,
        back: "Back",
        next: "Next",
        viewResult: "See result",
        questions: [
          {
            id: "goal",
            prompt: "What is the main goal of your investment?",
            options: [
              { label: "Preserve the wealth I already have", weight: 1 },
              { label: "Supplement my income predictably", weight: 2 },
              { label: "Balanced growth in the medium term", weight: 3 },
              { label: "Maximize returns, accepting swings", weight: 4 },
            ],
          },
          {
            id: "horizon",
            prompt: "How long do you plan to keep this investment?",
            options: [
              { label: "Less than 1 year", weight: 1 },
              { label: "1 to 3 years", weight: 2 },
              { label: "3 to 5 years", weight: 3 },
              { label: "More than 5 years", weight: 4 },
            ],
          },
          {
            id: "experience",
            prompt: "What is your experience with stocks and tokenized assets?",
            options: [
              { label: "I have never invested in stocks or tokenized assets", weight: 1 },
              { label: "I have invested in stocks, but not in tokenized assets", weight: 2 },
              { label: "I have occasionally invested in stocks and tokenized assets", weight: 3 },
              { label: "I have been actively investing for years", weight: 4 },
            ],
          },
          {
            id: "drawdown-reaction",
            prompt: "If your portfolio dropped 20% in a month, what would you do?",
            options: [
              { label: "Sell everything to avoid further losses", weight: 1 },
              { label: "Sell part of it to reduce risk", weight: 2 },
              { label: "Hold the position and wait for a recovery", weight: 3 },
              { label: "Take the chance to buy more", weight: 4 },
            ],
          },
          {
            id: "risk-tolerance",
            prompt: "How would you describe your risk tolerance?",
            options: [
              { label: "None: I don't accept losing the amount invested", weight: 1 },
              { label: "Low: I accept small swings", weight: 2 },
              { label: "Moderate: I accept temporary losses for more return", weight: 3 },
              { label: "High: I seek return even with the risk of significant losses", weight: 4 },
            ],
          },
        ],
      },
      result: {
        whatItMeans: "What this profile means",
        riskReaction: "Reaction to risk and volatility",
        assetClasses: "Most suitable asset classes",
        disclaimer:
          "Illustrative result. It isn't an investment recommendation and doesn't replace the profile analysis required by regulation.",
        redo: "Retake assessment",
      },
      categoryDetails: {
        conservador: {
          summary: "Prioritizes preserving capital and predictability, with a low tolerance for losses.",
          riskReaction:
            "Tends to react to sharp drops by quickly reducing exposure, even if that means locking in a loss.",
          assetClasses:
            "Best suited to tokenized debt securities and low-volatility assets.",
        },
        moderado: {
          summary:
            "Seeks a balance between growth and safety, accepting moderate swings in exchange for better returns than fixed income.",
          riskReaction:
            "Usually tolerates temporary drops without panicking, but reassesses the strategy if volatility persists.",
          assetClasses:
            "Best suited to a diversified mix of ownership tokens and debt securities, with less exposure to more volatile assets.",
        },
        arrojado: {
          summary: "Prioritizes maximizing long-term return and accepts high volatility as part of the process.",
          riskReaction:
            "Tends to hold or even increase positions during drops, counting on a recovery within the investment horizon.",
          assetClasses:
            "Best suited to greater exposure to corporate ownership tokens and higher risk/return deals, with more concentrated positions.",
        },
      },
    },
    wallet: {
      title: "Wallet",
      subtitle:
        "A real connection to your wallet: only the address and network are read. No transaction is made.",
      networkNote:
        "Demo network: Ethereum Sepolia (testnet). The connection itself is real, but the rest of the platform is still a demo: no purchase, sale or other operation with securities is made through this connection.",
      notDetected: "No wallet detected in this browser.",
      installMetaMask: "Install MetaMask",
      connectButton: "Connect wallet",
      connecting: "Connecting…",
      reconnectionTimedOut:
        "The automatic reconnection didn't respond. Unlock your wallet and connect manually.",
      connectionRejected: "The connection request was refused in the wallet.",
      disconnectButton: "Disconnect",
      disconnectAriaLabel: "Disconnect wallet",
      disconnectNote:
        "Disconnecting ends the session here on the site; the wallet itself stays under MetaMask's control. To revoke access completely, use MetaMask's own connection settings.",
      wrongNetwork:
        "A network other than Sepolia was detected. This is a demo environment; no real operation happens on this platform, on any network.",
      switchNetworkButton: "Switch to Sepolia",
      switchingNetwork: "Switching network…",
      copyAddress: "Copy full address",
      addressCopied: "Address copied",
      panel: {
        title: "Connection details",
        status: "Status",
        statusConnected: "Connected",
        statusDisconnected: "Not connected",
        address: "Address",
        network: "Network",
        unknownNetwork: "Unsupported network",
        balance: "Balance (test ETH)",
        noConnectionNote: "Connect your wallet to see the details here.",
        loadingBalance: "Loading…",
      },
      link: {
        title: "Link to your profile",
        explanation:
          "Connecting (above) only reads the wallet address in this browser session; nothing is saved. Linking stores that address in your account, to identify it in future sessions.",
        linkedLabel: "Linked to your profile",
        connectedNowLabel: "Connected now",
        none: "None",
        saveButton: "Save this wallet to your profile",
        saving: "Saving…",
        switchButton: "Switch to the connected wallet",
        switching: "Switching…",
        unlinkButton: "Unlink",
        unlinking: "Unlinking…",
        connectToLink: "Connect a wallet above to be able to link it to your profile.",
        successLinked: "Wallet linked to your profile.",
        successUnlinked: "Wallet unlinked from your profile.",
      },
    },
  },
  docs: {
    meta: {
      title: "Docs",
      description:
        "What Niara PMEs is, how tokenization works and what stage the project is at today.",
    },
    title: "Docs",
    subtitle:
      "What Niara PMEs is, how tokenization works and what stage the project is at today.",
    nav: {
      ariaLabel: "Docs navigation",
      whatIs: "What Niara PMEs is",
      howItWorks: "How tokenization works",
      framework: "Regulatory framework",
      revenueModel: "Revenue model",
      technology: "Technology",
      faq: "FAQ",
    },
    currentStage: {
      label: "Current stage",
      text:
        "a prototype in a testnet environment. There are no production contracts on mainnet and no published security audit so far. All of the site's content is a demo: no real offering is available.",
    },
    whatIs: {
      title: "What Niara PMEs is",
      text:
        "Niara PMEs is a platform that helps small and medium-sized enterprises raise investment and organize how their capital is split in a more accessible way, through tokenization. The goal is to cut cost and red tape when structuring fundraising rounds and recording ownership. Content in a demo stage.",
    },
    howItWorks: {
      title: "How tokenization works",
      steps: [
        {
          title: "Company sign-up",
          text: "The company creates its profile and provides the offering data.",
        },
        {
          title: "Structuring the offering",
          text:
            "Defining the amounts, the conditions and what will be tokenized (ownership/shares, receivables or debt), within the applicable regulatory framework.",
        },
        {
          title: "Token issuance",
          text:
            "On-chain generation of the tokens that represent the stake/right, with a record. No token is issued without the corresponding backing/attestation.",
        },
        {
          title: "Fundraising and record",
          text:
            "Investors take part and the ownership record (cap table) is available transparently.",
        },
      ],
    },
    framework: {
      title: "Regulatory framework",
      paragraphs: [
        "Public fundraising through electronic platforms in Brazil is regulated by CVM Resolution 88 (investment crowdfunding), and distribution must happen through a platform authorized/registered with the CVM. At this stage, Niara PMEs is an institutional and demo environment: it doesn't make a public offering of securities nor promise returns. Tokenized assets that qualify as securities depend on the applicable regulatory authorizations.",
        "Recording ownership on a blockchain works as evidence of integrity and precedence; it doesn't replace the corporate books required by Law 6.404 nor a notary record.",
      ],
    },
    revenueModel: {
      title: "Revenue model",
      text:
        "The planned revenue model involves structuring/listing fees charged to the company that tokenizes and fees on transactions. The percentages are still being defined and will be disclosed transparently.",
    },
    technology: {
      title: "Technology",
      text:
        "Niara's contracts are written in Solidity and are EVM-compatible, which allows deploying them on compatible networks. A core invariant guarantees that no token is issued without attested backing (the total issued never exceeds the total attested).",
    },
    faq: {
      title: "FAQ",
      items: [
        {
          question: "What is a tokenized asset?",
          answer:
            "A digital, on-chain representation of a stake or right, which can be recorded and transferred more simply.",
        },
        {
          question: "How does a company tokenize its capital on Niara PMEs?",
          answer:
            "Through the sign-up → offering structuring → issuance → fundraising/record flow described above (a demo at this stage).",
        },
        {
          question: "Do I need a wallet to take part?",
          answer:
            "At this demo stage there is no real operation; in the future, a wallet may be used to hold the tokens.",
        },
        {
          question: "What are the fees?",
          answer:
            "The fee model is still being defined and will be disclosed transparently (no fixed amounts for now).",
        },
        {
          question: "Is this a securities offering? Is it regulated?",
          answer:
            "No. At this stage it is institutional/demo content; offerings depend on CVM authorizations (CVM Resolution 88 and the applicable rules).",
        },
        {
          question: "What stage is the project at?",
          answer:
            "In development: the site shows the product's structure in a fully simulated way; the contracts are a prototype, in a testnet environment.",
        },
        {
          question: "Is my data safe?",
          answer:
            "At this stage, form data is neither sent to a server nor persisted; it follows the LGPD (Brazil's data protection law) guidelines.",
        },
      ],
    },
  },
  contact: {
    meta: {
      title: "Contact us",
      description: "Partnerships, tokenization, press or support: pick a subject and tell us about it.",
    },
    title: "Contact us",
    subtitle: "Partnerships, tokenization, press or support: pick a subject and tell us about it.",
    form: {
      name: "Name",
      email: "Email",
      subject: "Subject",
      subjectOptions: {
        company: "A company that wants to tokenize",
        investor: "Investor",
        partnerships: "Partnerships",
        press: "Press",
        support: "Support",
        other: "Other",
      },
      message: "Message",
      note: (email: string) =>
        `There is no automatic sending yet: when you submit, your default email client opens with the message prefilled for ${email}.`,
      sendButton: "Open email",
      errors: {
        name: "Enter your name.",
        email: "Enter a valid email.",
        message: "Write a message.",
      },
      subjectPrefix: (subject: string) => `Contact via the site — ${subject}`,
    },
    direct: {
      title: "Talk to us directly",
    },
  },
  trade: {
    demoBanner: {
      label: "Demo",
      text: "categories and examples are mostly illustrative. Offerings with the \"Real — Sepolia\" badge involve real transactions on the testnet, but the company behind them is still fictitious.",
    },
    hub: {
      meta: {
        title: "Assets and tokens",
        description: "The asset types that can be tokenized on the platform, as a demo.",
      },
      title: "Assets and tokens",
      subtitle:
        "The asset types that can be tokenized on the platform. Pick a category to understand how it works.",
      categoriesHeading: "Categories",
      viewCategory: "View category →",
    },
    showcase: {
      title: "Showcase (demo)",
      exampleTag: "Fictitious example · simulated values",
      viewDetails: "Trade →",
    },
    realOffering: {
      badge: "Real offering · accepts reservations",
      fundraisingTarget: "Fundraising target",
      valuePerShare: "Value per share",
      shareCount: "Number of shares",
      deadline: "Deadline",
      notProvided: "Not provided",
      viewOffering: "Trade →",
    },
    myOfferingCard: {
      badge: "Demo — offering creation",
      fundraisingTarget: "Fundraising target",
      valuePerShare: "Value per share",
      shareCount: "Number of shares",
      deadline: "Deadline",
      notProvided: "Not provided",
      viewOffering: "Trade →",
    },
    smesOnChain: {
      badge: "Real — Sepolia",
      solanaBadge: "Real — Solana Devnet",
      fictitiousCompany: "Fictitious demo company",
      fundraisingTarget: "Fundraising target",
      pricePerShare: "Price per share",
      shares: "Shares",
      viewOffering: "Trade →",
      issuerData: "Data provided by the issuer itself (demo)",
    },
    categories: {
      pmes: {
        shortDescription: "Ownership stakes or receivables of small and medium-sized enterprises.",
        backing: "An SME ownership stake or receivable",
        useCases: [
          "Opening new branches or units",
          "Cash advance on receivables",
          "Working capital to launch a new product",
        ],
      },
      agro: {
        shortDescription: "Agribusiness operations and assets, such as harvests and machinery.",
        backing: "A farming operation, machinery or an agribusiness receivable",
        useCases: [
          "Harvest costs and working capital",
          "Buying or renewing machinery",
          "Advance on production receivables",
        ],
      },
      imobiliario: {
        shortDescription: "Shares and receivables backed by real estate developments.",
        backing: "SPE shares or a real estate receivable",
        useCases: [
          "Financing construction in progress",
          "Buying a new property or plot of land",
          "Advance on rent or sale receivables",
        ],
      },
      auto: {
        shortDescription: "Fleets, vehicles and services of the automotive sector.",
        backing: "A vehicle fleet or an automotive sector operation",
        useCases: [
          "Renewing or expanding a fleet",
          "Expanding a network of repair shops or services",
          "Working capital for parts and inventory",
        ],
      },
      divida: {
        shortDescription: "Structured debt instruments, such as receivables advances.",
        backing: "A receivable or the company's structured debt",
        useCases: [
          "Advance on sales receivables",
          "Short-term working capital",
          "Financing seasonal inventory",
        ],
      },
    },
    categoryTemplate: {
      back: "‹ Assets and tokens",
      factSheetTitle: "Asset fact sheet",
      backing: "Backing",
      audience: "Audience",
      audienceValue: "Investors registered on the platform",
      framework: "Regulatory framework",
      frameworkValue: "To be validated (CVM)",
      stage: "Stage",
      stageValue: "Prototype",
      useCasesTitle: "Use cases",
      realOfferingsTitle: "Real offerings in this category",
      realOfferingsNote: "Real offerings, open for reservations. Only visible to registered, signed-in investors.",
      yourOfferingTitle: "Your offering in this category",
      yourOfferingNote:
        "An offering registered by your company. Only visible to you, the offering owner, with no reservation option.",
      showcaseTitle: "Examples (demo)",
      showcaseTitleSmesOnChain: "SME offerings (real Sepolia, fictitious companies)",
      publishOfferingButton: "Publish offering",
      sectorFilter: {
        ariaLabel: "Filter by sector",
        all: "All",
      },
      footnote:
        "Fictitious examples with simulated values. This is not a public offering of securities. Offerings depend on the applicable CVM authorizations.",
    },
    offering: {
      demoBanner: "Demo content: no real offering.",
      demoBannerOnChain:
        "A fictitious demo company, but the blockchain investment below is real, on the Sepolia testnet.",
      mixedNotice:
        "This company is fictitious (demo data), but the investment below is real: transactions actually signed and confirmed on the Sepolia testnet, not a product simulation.",
      demoBannerSelfService:
        "Data provided by the issuer itself (demo), but the blockchain investment below is real, on the Sepolia testnet.",
      selfServiceNotice:
        "This company's data was provided by the issuer itself (demo), and the investment below is real: transactions actually signed and confirmed on the Sepolia testnet, not a product simulation.",
      demoBannerSelfServiceSolana:
        "Data provided by the issuer itself (demo), but the blockchain investment below is real, on Solana Devnet.",
      selfServiceSolanaNotice:
        "This company's data was provided by the issuer itself (demo), and the investment below is real: transactions actually signed and confirmed on Solana Devnet, not a product simulation.",
      backToCategory: "‹ Back to the category",
      publicData: {
        title: "Public company data",
        legalName: "Legal name",
        cnpj: "CNPJ (fictitious)",
        sector: "Sector",
        location: "Location",
        summary: "Business summary",
      },
      financial: {
        title: "Financials / cash (demo)",
        annualRevenue: "Annual revenue",
        availableCash: "Available cash",
        endividamento: "Debt",
        note: "Simulated indicators: fictitious data.",
        revenueSeries: "Revenue",
        cashSeries: "Cash",
        chartDescription:
          "Chart description: simulated evolution of revenue and cash over the last 6 months. Fictitious data, unrelated to the company's real performance.",
      },
      indicators: {
        title: "Fundamental indicators",
        note: "Simulated demo indicators: they don't reflect real values nor an analysis of any company.",
        helpAria: (nome: string) => `What is ${nome}?`,
        groups: {
          valuation: {
            label: "Valuation",
            items: {
              pl: {
                name: "P/E",
                unit: "number",
                explanation:
                  'Share price divided by earnings per share; shows how many years of earnings it would take to "pay back" the price.',
              },
              pvp: {
                name: "P/B",
                unit: "number",
                explanation: "Price divided by book value per share; how much the market pays over the book equity.",
              },
              psr: {
                name: "P/Sales (PSR)",
                unit: "number",
                explanation: "Market value divided by net revenue.",
              },
              evEbitda: {
                name: "EV/EBITDA",
                unit: "number",
                explanation:
                  "Enterprise value (EV) divided by EBITDA; an operating multiple independent of the capital structure.",
              },
              evEbit: {
                name: "EV/EBIT",
                unit: "number",
                explanation: "Enterprise value divided by EBIT (operating profit).",
              },
              pEbitda: {
                name: "P/EBITDA",
                unit: "number",
                explanation: "Market value divided by EBITDA.",
              },
              pEbit: {
                name: "P/EBIT",
                unit: "number",
                explanation: "Market value divided by EBIT.",
              },
              pAtivo: {
                name: "P/Assets",
                unit: "number",
                explanation: "Market value divided by total assets.",
              },
              pAtivoCircLiq: {
                name: "P/Net Current Assets",
                unit: "number",
                explanation: "Price divided by net current assets (current assets minus liabilities).",
              },
              pCapGiro: {
                name: "P/Working Capital",
                unit: "number",
                explanation: "Price divided by working capital (current assets minus current liabilities).",
              },
              lpa: {
                name: "EPS",
                unit: "number",
                explanation: "Earnings per share: net income divided by the number of shares.",
              },
              vpa: {
                name: "BVPS",
                unit: "number",
                explanation: "Book value per share: shareholders' equity divided by the number of shares.",
              },
            },
          },
          eficiencia: {
            label: "Efficiency",
            items: {
              margemBruta: {
                name: "Gross margin",
                unit: "percent",
                explanation: "Gross profit divided by net revenue.",
              },
              margemEbitda: {
                name: "EBITDA margin",
                unit: "percent",
                explanation: "EBITDA divided by net revenue.",
              },
              margemEbit: {
                name: "EBIT margin",
                unit: "percent",
                explanation: "EBIT (operating profit) divided by net revenue.",
              },
              margemLiquida: {
                name: "Net margin",
                unit: "percent",
                explanation: "Net income divided by net revenue.",
              },
              giroAtivos: {
                name: "Asset turnover",
                unit: "number",
                explanation: "Revenue divided by total assets; how much revenue the assets generate.",
              },
            },
          },
          rentabilidade: {
            label: "Profitability",
            items: {
              roe: {
                name: "ROE",
                unit: "percent",
                explanation: "Return on equity: net income divided by shareholders' equity.",
              },
              roa: {
                name: "ROA",
                unit: "percent",
                explanation: "Return on assets: net income divided by total assets.",
              },
              roic: {
                name: "ROIC",
                unit: "percent",
                explanation:
                  "Return on invested capital: after-tax operating result divided by invested capital.",
              },
            },
          },
          dividendos: {
            label: "Dividends",
            items: {
              dividendYield: {
                name: "Dividend yield",
                unit: "percent",
                explanation: "Dividends per share over the last 12 months divided by the share price.",
              },
              payout: {
                name: "Payout",
                unit: "percent",
                explanation: "The percentage of earnings paid out as dividends.",
              },
            },
          },
          endividamento: {
            label: "Debt",
            items: {
              liquidezCorrente: {
                name: "Current ratio",
                unit: "number",
                explanation:
                  "Current assets divided by current liabilities; the ability to meet short-term obligations.",
              },
              dividaLiquidaEbitda: {
                name: "Net debt/EBITDA",
                unit: "number",
                explanation: "Net debt divided by EBITDA; how many years of EBITDA it takes to pay off the debt.",
              },
              dividaLiquidaEbit: {
                name: "Net debt/EBIT",
                unit: "number",
                explanation: "Net debt divided by EBIT.",
              },
              dividaLiquidaPatrimonio: {
                name: "Net debt/Equity",
                unit: "number",
                explanation: "Net debt divided by shareholders' equity.",
              },
              dividaBrutaPatrimonio: {
                name: "Gross debt/Equity",
                unit: "number",
                explanation: "Gross debt divided by shareholders' equity.",
              },
              patrimonioAtivos: {
                name: "Equity/Assets",
                unit: "number",
                explanation: "Shareholders' equity divided by total assets.",
              },
              passivosAtivos: {
                name: "Liabilities/Assets",
                unit: "number",
                explanation: "Total liabilities divided by total assets.",
              },
            },
          },
          crescimento: {
            label: "Growth",
            items: {
              cagrReceitas5a: {
                name: "5-year revenue CAGR",
                unit: "percent",
                explanation: "Compound annual growth rate of revenue over the last 5 years.",
              },
            },
          },
        },
      },
      terms: {
        title: "Offering terms",
        tokenType: "What the token represents",
        tokenTypeValues: {
          equity: "Ownership stake / shares",
          receivable: "Receivable",
          debt: "Debt",
        },
        fundraisingTarget: "Fundraising target",
        valuePerToken: "Value per token/share",
        quantityTokens: "Number of tokens/shares",
        deadline: "Deadline",
        deadlineMonths: (months: number) => `${months} months`,
        note: "Any yield estimate is illustrative and is not a promise of return.",
      },
      documents: {
        title: "Documents",
        comingSoon: "Coming soon",
      },
      risks: {
        title: "Risks and notices",
        items: [
          "Investing in securities involves the risk of losing part or all of the capital invested.",
          "No return is promised or guaranteed; any estimate is merely illustrative.",
          "This is a demo environment: no real public offering is available and no order sent here is real.",
          "Future offerings will depend on the applicable regulatory authorizations (CVM Resolution 88) and on a CVM-authorized/registered platform.",
          "The on-chain record, when it exists, is evidence of integrity and precedence; it doesn't replace the corporate books required by Law 6.404 nor a notary record.",
        ],
      },
      tradeButton: "Trade (simulation)",
      notFound: {
        title: "Offering not found",
        description: "This demo offering doesn't exist or was removed.",
        back: "‹ Assets and tokens",
      },
    },
    orderTicket: {
      title: "Order ticket (simulation)",
      closeAria: "Close order ticket",
      demoBanner: "Demo — no real order is sent. There is no real trading of securities.",
      sideGroupLabel: "Buy or sell",
      buy: "Buy",
      sell: "Sell",
      quantity: "Quantity (tokens/shares)",
      price: "Price (R$)",
      totalEstimated: "Estimated total",
      fee: "Fee (estimated / to be defined)",
      simulatedBalance: "Simulated balance",
      reviewButton: "Review (simulation)",
      confirmButton: "Confirm (simulation)",
      backToEditButton: "Go back and edit",
      summaryTitle: "Order summary (simulation)",
      result: (side: "buy" | "sell", quantity: number, nome: string) =>
        `Simulated order recorded — ${side === "buy" ? "buy" : "sell"} ${quantity} ${nome} — no real transaction took place.`,
      newOrderButton: "New order (simulation)",
      errors: {
        invalidQuantity: "Enter a valid quantity, greater than zero.",
        invalidPrice: "Enter a valid price, greater than zero.",
      },
    },
  },
  signIn: {
    meta: {
      title: "Sign in",
    },
    closeAriaLabel: "Close and go back to the home page",
    title: "Sign in",
    subtitle: "Sign in with the email and password of your Niara PMEs account.",
    fundraisingTitle: "Sign in to structure your fundraising",
    fundraisingSubtitle:
      "Sign in with your account (or create a new one below) to structure your fundraising. Structuring the offering itself is still a demo and depends on CVM authorizations — fundraising onboarding is coming soon.",
    loginRequiredNotice: "Sign in or create an account to access this page.",
    video: {
      ariaLabel: "Watch on YouTube: how to create your MetaMask account (opens in a new tab)",
      text: "Before creating your account on the platform, watch the video and create your MetaMask account.",
    },
    email: {
      label: "Email",
      placeholder: "you@email.com",
    },
    password: {
      label: "Password",
      placeholder: "••••••••",
    },
    signInButton: "Sign in",
    createAccountButton: "Create account",
    signInPending: "Signing in…",
    or: "or",
    errors: {
      invalidEmail: "Enter a valid email.",
      shortPassword: "The password must be at least 6 characters long.",
      invalidCredentials: "Incorrect email or password.",
      emailAlreadyRegistered: "An account with this email already exists. Try signing in.",
      weakPassword: "Password too weak — use at least 6 characters.",
      generic: "We couldn't complete this. Please try again in a moment.",
    },
    google: {
      continueButton: "Continue with Google",
    },
    termsNote: "By continuing, you agree to the Terms of Use and the Privacy Policy (documents coming soon).",
  },
  account: {
    meta: {
      title: "Account",
      description: "Account area — session data and link to the investor or company registration.",
    },
    title: "Account",
    emailLabel: "Email",
    roleLabel: "Registration",
    investorRole: "Investor — registered",
    companyRole: "Company — registered",
    roleNotRegistered: "not registered yet (demo)",
    completeRegistrationButton: "Complete registration",
    myOfferingsButton: "My offerings",
    investButton: "Invest",
    companyOnlyNotice: "This area is only for registered companies. Complete your registration as a legal entity to create offerings.",
    investorOnlyNotice: "This area is only for registered investors. Complete your registration as an individual to reserve investments.",
    signOutButton: "Sign out",
    signOutPending: "Signing out…",
  },
  signUp: {
    meta: {
      title: "Complete registration",
      description: "Investor (individual) or company (legal entity) registration on Niara PMEs.",
    },
    accountStepCounter: "Step 1 of 3",
    typeStepCounter: "Step 2 of 3",
    dataStepCounter: "Step 3 of 3",
    account: {
      title: "Create your account",
      subtitle:
        "Set the email and password you'll use to access Niara PMEs. In the next step, you choose whether you'll use the platform as an investor or as a company.",
      email: {
        label: "Email",
        placeholder: "you@email.com",
      },
      password: {
        label: "Password",
        placeholder: "••••••••",
      },
      createAccountButton: "Create account",
      creatingAccountButton: "Creating account…",
      hasAccountLink: "Already have an account? Sign in",
    },
    title: "Complete your registration",
    subtitle:
      "Your login account has already been created. All that's left is your registration data to use the platform as an investor or as a company.",
    personType: {
      legend: "Registration type",
      individual: "Individual (investor)",
      individualDescription: "You'll invest in companies' fundraising offerings on the platform.",
      company: "Legal entity (company)",
      companyDescription: "Your company will structure a fundraising round or invest through the platform.",
    },
    dataTitle: "Registration data",
    dataSubtitlePf: "Fill in your personal data to complete your registration as an investor.",
    dataSubtitlePj: "Fill in your company's data to complete your registration as a legal entity.",
    personalSection: "Personal data",
    addressSection: "Address",
    fields: {
      country: "Country",
      brazil: "Brazil",
      email: "Email",
      fullName: "Full name",
      documentCpf: "CPF",
      documentCnpj: "CNPJ",
      birthDate: "Date of birth",
      legalName: "Legal name",
      tradeName: "Trade name",
      grossAnnualRevenue: "Gross annual revenue (R$)",
      phone: "Phone",
      cep: "CEP (postal code)",
      street: "Street",
      number: "Number",
      complement: "Complement",
      district: "Neighborhood",
      city: "City",
      state: "State",
      selectState: "Select",
    },
    errors: {
      required: "Required field.",
      invalidDocument: "Invalid document.",
      invalidDate: "Invalid date.",
      phoneInvalid: "Invalid phone number.",
      invalidCep: "Invalid CEP.",
    },
    demoNote:
      "Demo environment — use fictitious data only. This data is actually saved to your account (the same fields remain editable later under \"Profile\"); no identity verification (KYC) is done from here.",
    continueButton: "Continue",
    backButton: "Back",
    registerButton: "Complete registration",
    registeringButton: "Completing…",
  },
  companyOfferings: {
    meta: {
      title: "My offerings",
      description: "Fundraising offerings of the company registered on Niara PMEs.",
    },
    title: "My offerings",
    subtitle: "Create and activate your company's fundraising offerings.",
    empty: "No offerings registered yet.",
    createTitle: "New offering",
    fields: {
      offeringValue: "Offering value (R$)",
      additionalLot: "Additional lot (%)",
      minTarget: "Minimum target (R$)",
      deadlineDays: "Deadline (days)",
      valuePerShare: "Value per share (R$)",
      category: "Token category",
      categoryPlaceholder: "Select",
    },
    categoryNotice:
      "All categories are available in this demo. The real regulatory framework varies by category (Real Estate Token, Agro and Debt Securities have their own CVM rules) — fundraising under CVM Resolution 88 (SMEs) is the only thing this backend models today.",
    sharesPreview: (shares: string) => `Results in ${shares} shares.`,
    errors: {
      required: "Required field.",
      invalidValue: "Use the format 5.000.000,00.",
      invalidDeadline: "Enter a deadline between 1 and 180 days.",
      invalidLot: "Enter a percentage between 0 and 25.",
      invalidValuePerShare: "Use the format 5.000.000,00.",
      valuePerShareDoesNotDivide: "The offering value must be a multiple of the value per share.",
      invalidCategory: "Select a category.",
    },
    createButton: "Create offering (draft)",
    creatingButton: "Creating…",
    activateNotice:
      "Activation of new offerings is paused in this demo — fundraising is moving to run directly on real Sepolia, without going through this simulated flow.",
    closeButton: "Close fundraising (simulated)",
    closingButton: "Closing…",
    closeNotice:
      "In the demo, you can close the fundraising at any time. In the real product, closing respects the end of the offering's deadline.",
    status: {
      draft: "Draft",
      active: "Active",
      funded: "Funded",
      failed: "Didn't reach the target",
      settled: "Settled",
      cancelled: "Cancelled",
    },
    card: {
      createdOn: "Created on",
      value: "Offering value",
      cap: "Cap (with additional lot)",
      minTarget: "Minimum target",
      paid: "Paid so far",
      window: "Fundraising window",
      valuePerShare: "Value per share",
      shareCount: "Number of shares",
      category: "Category",
      notProvided: "Not provided",
    },
    result: {
      funded: "Target reached — tokens issued (simulated).",
      failed: "Target not reached — investments refunded (simulated).",
      issuedTokens: "Tokens issued (simulated)",
      ref: "Reference (simulated)",
    },
    publishLink: "Publish on-chain →",
    onchainStatus: {
      pendente: {
        title: "Publication in progress",
        text: "Transaction signed — awaiting on-chain confirmation.",
        link: "View status →",
      },
      confirmada: {
        title: "Published on-chain",
        contract: "Offering contract",
        token: "Token contract",
        viewOffering: "View public offering →",
      },
      divergente: {
        title: "Discrepancy found in the publication",
        text: "The check found an inconsistency between the transaction and this offering's data — review it before proceeding.",
        link: "Review →",
      },
    },
    publishOnChain: {
      meta: {
        title: "Publish on-chain",
        description: "Eligibility check to publish your offering on Sepolia.",
      },
      back: "← Back to My offerings",
      banner: "real publication on Sepolia. A testnet with no real value; read the terms before signing.",
      title: "Publish on-chain",
      subtitle: "Go through the checklist, review the data that goes to the blockchain and sign with your own wallet.",
      notFound: {
        title: "Offering not found",
        description: "This offering doesn't exist or doesn't belong to your account.",
        back: "Back to My offerings",
      },
      notEligible: {
        title: "This offering can't be published right now",
        text: "Only draft offerings can be published on-chain — this one has already changed status.",
        noValuePerShare: "This offering has no value per share defined — the number of shares to publish on-chain can't be calculated.",
        res88Limits: {
          intro:
            "This offering violates CVM Resolution 88 limits recorded in the offering itself — the chain will always reject the publication, because the contract checks the same limits again. Publishing again won't help: you need to recreate the offering under My offerings with valid values.",
          cap: (capValue: string) => `The offering cap (${capValue}) exceeds the R$15,000,000.00 limit of CVM Resolution 88.`,
          additionalLot: (baseValue: string, capValue: string, maxAllowed: string) =>
            `The offering cap (${capValue}) exceeds 25% over the base value (${baseValue}) — the maximum allowed would be ${maxAllowed}, under CVM Resolution 88.`,
          deadline: (days: number) => `A deadline of ${days} days exceeds the 180-day limit of CVM Resolution 88.`,
        },
      },
      noLinkedWallet: {
        title: "No wallet linked to your account",
        text: "Before publishing, go to Profile and link the MetaMask wallet that will sign on behalf of this company.",
        link: "Go to Profile →",
      },
      gates: {
        title: "Checklist before signing",
        statusLabels: {
          ok: "OK",
          rejected: "Failed",
          error: "Read error",
          loading: "Checking…",
        },
        provider: {
          label: "MetaMask wallet detected",
          rejected: "No injected wallet was detected in this browser — install MetaMask to continue.",
        },
        network: {
          label: "Connected to the Sepolia network",
          notConnected: "Connect your wallet to check the network.",
          wrongNetwork: (chainId: number) => `Connected to network ${chainId} — switch to Sepolia in MetaMask.`,
        },
        balance: {
          label: "Enough ETH balance for gas",
          loading: "Checking balance and gas price on Sepolia…",
          error: "Couldn't check the balance or the gas price right now — try again in a moment.",
          rejected: (balance: string, cost: string) =>
            `A balance of ${balance} isn't enough for the estimated gas cost of ${cost} (an estimate with a safety margin — the gas price on Sepolia has varied a lot within a single session).`,
          ok: (balance: string, cost: string) => `Balance of ${balance} — estimated gas cost: ${cost}.`,
        },
        authorized: {
          label: "Wallet authorized by Niara to publish (emissoresAutorizados)",
          notConnected: "Connect your wallet to check the authorization.",
          rejected: "This wallet hasn't been authorized by Niara to publish offerings yet — talk to the team.",
          error: "Couldn't check the on-chain authorization right now — try again in a moment.",
        },
        ownership: {
          label: "The connected wallet is the one linked to your account",
          noLinkedWallet: "No linked wallet — see the notice above.",
          notConnected: "Connect your wallet to compare.",
          different: (linked: string, connected: string) =>
            `The wallet linked to your account (${linked}) is different from the one connected now (${connected}). Switch in MetaMask or link the current one in Profile.`,
        },
        term: {
          label: "Publication terms accepted",
          rejected: "Fill in the token data and tick the terms box below before publishing.",
        },
      },
      button: {
        label: "Publish on-chain",
        blockedAria: "Publication blocked",
        pendingItems: "Pending items before the button is enabled:",
      },
      form: {
        title: "Data that goes to the blockchain",
        notice: "These three fields are recorded forever in the ERC-20 token created on Sepolia — review them before signing.",
        defaultNameSuffix: "Equity",
        name: "Offering name (ERC-20 “name”)",
        symbol: "Token symbol (ERC-20 “symbol”)",
        series: "Series",
        errors: {
          nameRequired: "Enter a name.",
          symbolRequired: "Enter a symbol.",
          seriesRequired: "Enter a series.",
        },
      },
      termText: {
        title: "Before publishing, read carefully",
        intro:
          "You're about to sign a real transaction on the Sepolia test network, using your own wallet and paying your own gas in test ETH. Unlike the wallet connection in Profile (which only reads your address and balance), this action writes permanent data to a public blockchain — Niara doesn't sign for you and can't undo it afterwards.",
        items: [
          "It's a test network, with no real value. Sepolia ETH and the MockBRL used in this demo have no backing and no financial value at all. No real money changes hands here.",
          "The record is public and permanent. Your company's name and this offering's terms (target, deadline, value per share) will be recorded forever on a public blockchain, visible to anyone on Etherscan — even after you delete your Niara PMEs account. Your CNPJ isn't recorded as text — only a hash (bytes32) of it, which can't be reversed to the original number from the chain.",
          "You pay your own gas. The transaction costs test ETH from your wallet — Niara doesn't cover, refund or sponsor this fee.",
          "This is not a public offering of securities. Niara PMEs is not a platform authorized by the Brazilian Securities and Exchange Commission (CVM). Nothing here is a real investment offering, and the on-chain record doesn't replace the corporate books required by Law 6.404/76 nor a notary record.",
          "Unlike an investor on this platform, this is the first time you, as the issuer, sign a transaction here. Once published, your offering may receive real test investments from other wallets — review the terms carefully before confirming.",
        ],
        checkbox: "I've read and understood the points above, and I want to go ahead with publishing on Sepolia.",
      },
      publication: {
        signing: "Waiting for your signature in MetaMask…",
        registering: "Signature received — recording the attempt…",
        confirming: "Transaction sent — waiting for confirmation on Sepolia…",
        pendingTitle: "Not published yet",
        pendingText:
          "Your transaction was sent but hasn't confirmed yet. This does NOT mean the offering is already published — come back here in a moment to check. Follow it directly on Etherscan:",
        viewOnEtherscan: "View on Etherscan →",
        confirmedTitle: "Published on Sepolia",
        confirmedText: "Your offering was confirmed on-chain. Contract addresses:",
        contractLabel: "Offering (escrow)",
        tokenLabel: "Token (shares)",
        revertedTitle: "The transaction reverted",
        divergentTitle: "Discrepancy detected",
        divergentText: "The chain reading didn't match what was expected in this check — review the reason below before reprocessing. This doesn't create a new transaction, it only re-checks the same transaction already sent.",
        reprocess: "Reprocess",
        reprocessNote: "Re-checks the same transaction (doesn't sign anything new) — use it once you understand why it diverged.",
        verifyAgain: "Check again",
        divergentConsistencyText:
          "This offering's data in Supabase changed after publication and no longer matches the immutable values already recorded in the contract — review the reason below. The chain never changes; the fix, if any, is always in Supabase.",
        verifyConsistency: "Check consistency",
        verifyConsistencyNote:
          "Re-reads the contract values (metaMinima/metaMaxima/precoPorCota/prazo) and compares them with this offering in Supabase right now — it doesn't fix either side, it only flags.",
      },
    },
  },
  invest: {
    meta: {
      title: "Invest",
      description: "Showcase of real fundraising offerings open on Niara PMEs.",
    },
    title: "Invest",
    subtitle: "Real fundraising offerings, open now, from companies registered on the platform.",
    realNotice:
      "These are real offerings recorded in the system — unlike the demo showcases in Trade and Assets. Reserving an investment here actually writes to the database.",
    linkOnChain: {
      text: "Looking for the demo with a real blockchain?",
      link: "Invest on the Sepolia testnet (real transactions)",
    },
    empty: "No offerings open for reservation right now.",
    card: {
      statusActive: "Active",
      minTarget: "Minimum target",
      cap: "Offering cap",
      alreadyReserved: "Already reserved/paid",
      window: "Fundraising window",
      viewOffering: "View offering →",
    },
    form: {
      title: "Reserve investment",
      closeAria: "Close",
      fieldValue: "Investment amount (R$)",
      confirmButton: "Reserve (writes to the database)",
      confirmingButton: "Reserving…",
      cancelButton: "Cancel",
      invalidValueError: "Use the format 1.000,00.",
      success: "Reservation recorded. It shows up under \"My reservations\" below.",
    },
    detail: {
      back: "‹ Back to offerings",
      reserveButton: "Reserve investment",
      owner: {
        notice:
          "This is your offering — the issuer can't invest in its own fundraising. Follow its progress in",
        link: "My offerings",
      },
      notFound: {
        title: "Offering not found",
        description: "This offering doesn't exist, is no longer open for reservation, or was removed.",
        back: "‹ Back to offerings",
      },
      publicData: {
        title: "Public company data",
        legalName: "Legal name",
        tradeName: "Trade name",
        cnpj: "CNPJ",
        cnpjNotPublished: "Not disclosed by the company",
        sector: "Sector",
        location: "Location",
        notProvided: "Not provided",
        summary: "Business summary",
      },
      terms: {
        title: "Offering terms",
        category: "Category",
        minTarget: "Minimum target",
        cap: "Cap (with additional lot)",
        alreadyReserved: "Already reserved/paid",
        valuePerShare: "Value per share",
        shareCount: "Number of shares",
        window: "Fundraising window",
        notProvided: "Not provided",
        note: "Any yield estimate is illustrative and is not a promise of return.",
      },
      documents: {
        title: "Documents",
        comingSoon: "Coming soon",
      },
      risks: {
        title: "Risks and notices",
        items: [
          "Investing in securities involves the risk of losing part or all of the capital invested.",
          "No return is promised or guaranteed; any estimate is merely illustrative.",
          "This offering is real (recorded in the database), but the platform still runs in a demo environment — the full regulatory framework (CVM authorization, CVM Resolution 88) depends on legal validation before any public fundraising from the general market.",
          "The on-chain record, when it exists, is evidence of integrity and precedence — it doesn't replace the corporate books required by Law 6.404 nor a notary record.",
        ],
      },
    },
    myReservations: {
      title: "My reservations",
      simulatedNotice:
        "Payment and identity verification (KYC) in this section are simulated — no real money is moved.",
      empty: "You haven't reserved any investment yet.",
      reservedOn: "Reserved on",
      status: "Reserved — awaiting payment",
      confirmButton: "Confirm payment (simulated)",
      confirmingButton: "Confirming…",
      paidStatus: "Paid (simulated)",
      refLabel: "Reference (simulated)",
      kycNotice:
        "Your KYC (demo) hasn't been approved yet — you need to get it approved before confirming the payment.",
      kycButton: "Do KYC (demo)",
      kycSending: "Sending…",
    },
  },
  investOnChain: {
    meta: {
      title: "Invest — real on-chain (Sepolia and Solana)",
      description: "Investment flow with real transactions signed on the Sepolia testnet and on Solana Devnet.",
    },
    title: "Real investment — Sepolia testnet",
    subtitle:
      "This screen runs real transactions on Sepolia: MockBRL has no value at all, but the signatures, the hashes and the contract state are real on-chain — unlike the rest of the platform, which is demo/mock.",
    realNotice:
      "Real on the Sepolia testnet. No market value is involved (MockBRL is a test mock, with no backing), but each transaction below is actually signed and confirmed on the network — it isn't a product simulation.",
    requirements: {
      title: "Before you start",
      items: [
        "MetaMask installed, connected and on the Sepolia network.",
        "Sepolia ETH in the wallet to pay the gas for each transaction — get it from a public Sepolia faucet.",
        "Test MockBRL — you can get it below, directly with the connected wallet.",
      ],
    },
    contractNotConfigured:
      "This offering hasn't been configured in this environment yet (contract addresses missing). You need to run the admin script that creates the offering on Sepolia and fill .env.local with the generated addresses.",
    noWallet: "Connect your wallet to see your balance, your position and invest in this offering.",
    offeringSelector: {
      label: "Demo offering (several available, on Sepolia and on Solana Devnet — pick one before investing)",
      option: "Offering",
      provenance: {
        legacy: "Fictitious demo company",
        selfService: "Data provided by the issuer itself (demo)",
      },
    },
    faucet: {
      title: "1. Get test MockBRL",
      description:
        "MockBRL is a test mock — no backing, no value, public and unrestricted mint. Any wallet can mint a balance for itself, without depending on an admin wallet.",
      balanceLabel: "Your MockBRL balance",
      quantityLabel: "Amount to mint",
      button: "Mint MockBRL",
      signing: "Waiting for signature…",
      confirming: "Confirming on the network…",
      success: "MockBRL minted successfully.",
    },
    terms: {
      title: "2. Offering terms (read directly from the contract)",
      stateLabel: "State",
      states: {
        Aberta: "Open",
        EncerradaSucesso: "Closed — success",
        EncerradaFalha: "Closed — failure",
      },
      totalRaised: "Total raised",
      minTarget: "Minimum target",
      maxTarget: "Maximum target",
      pricePerShare: "Price per share",
      deadline: "Deadline",
      capPerInvestor: "Cap per investor (in this offering)",
      note: "The cap per investor here is only this specific offering's limit — it doesn't replace CVM Resolution 88's annual cross-platform cap, which is off-chain and self-declared.",
      feeLabel: "Platform fee",
      feeWithFee: (pct: string) =>
        `${pct}% — withheld from the amount passed on to the issuer when the fundraising closes successfully (see the "Release funds" section below). It isn't deducted from the number of shares you receive.`,
      feeWithoutFee: "No fee in this offering (taxaBps = 0, read directly from the contract).",
    },
    invest: {
      title: "3. Invest",
      quantityLabel: "Number of shares",
      valueLabel: "Amount to invest",
      allowanceNote:
        "If your MockBRL allowance is insufficient, you'll sign an approval before the investment — only when needed.",
      button: "Invest",
      status: {
        idle: "",
        "checking-allowance": "Checking MockBRL allowance…",
        "signing-approve": "Waiting for the MockBRL approval (approve) signature…",
        "confirming-approve": "Confirming approval on the network…",
        "simulating-invest": "Checking whether the investment would be accepted before asking for your signature…",
        "signing-invest": "Waiting for the investment signature…",
        "confirming-invest": "Confirming investment on the network…",
        success: "Investment confirmed on-chain.",
        error: "Couldn't complete the investment.",
      },
      offeringClosedSuccess: "This offering has already closed successfully — investing is no longer possible. If you invested, redeem your shares below.",
      offeringClosedFailure: "This offering closed without reaching the minimum target — investing is no longer possible.",
      invalidQuantity: "Enter a valid number of shares.",
      exceedsCapacity: (remaining: string) => `This amount exceeds the offering's remaining capacity (${remaining}).`,
      exceedsCap: (remaining: string) => `This amount exceeds the cap per investor (${remaining} remaining).`,
      insufficientBalance: "Insufficient MockBRL balance — use the faucet above.",
      loading: "Loading this offering's data and your position — wait before investing.",
      readError: (reason: string) =>
        `Couldn't confirm this offering's data right now (${reason}) — investing stays blocked until the read works, so a decision is never made with an unconfirmed value.`,
    },
    position: {
      title: "Your position in this offering",
      invested: "You've invested",
      eligibleForRedemption: "Shares to redeem",
      alreadyRedeemed: "Shares already redeemed to this wallet",
      participationBalance: "Your participation balance (on-chain)",
    },
    close: {
      title: "4. Close the offering",
      description:
        "The contract itself is permissionless — any wallet could close it directly on the network as soon as the deadline ends or the total raised hits the maximum target exactly. This rule is on purpose: no investor is held hostage by the platform or the issuing company to get their investment back from a fundraising that didn't close. In this interface, for now, the button below is available to the Niara team and to the company that issued this offering.",
      restricted:
        "Blocked in this interface for now — only available to the Niara team and to the company that issued this offering. Any other wallet can close it the same way, directly on the network.",
      button: "Close offering",
      signing: "Waiting for signature…",
      confirming: "Confirming on the network…",
      success: "Offering closed on-chain.",
    },
    redeem: {
      title: "5. Redeem shares",
      description:
        "After a successful close, redeem (pull, once) the shares proportional to your investment.",
      button: "Redeem shares",
      signing: "Waiting for signature…",
      confirming: "Confirming on the network…",
      success: "Shares redeemed — check the participation balance above.",
    },
    release: {
      title: "6. Release funds to the issuer",
      description:
        "Transfers (pull, once, permissionless in the contract) the amount raised to the issuer and, if this offering has taxaBps > 0, the platform fee to protocoloWallet. Without this call, the money stays locked in escrow forever. In this interface, for now, the button below is only available to the Niara team.",
      restricted: "Blocked in this interface for now — only available to the Niara team.",
      preview: (issuerValue: string, fee: string) => `If released now: ${issuerValue} to the issuer, ${fee} as a fee to the protocol.`,
      alreadyReleased: "Funds already released for this offering.",
      button: "Release funds",
      signing: "Waiting for signature…",
      confirming: "Confirming on the network…",
      success: "Funds released on-chain — check the transaction on Etherscan.",
    },
    errors: {
      wrongNetwork: "Switch to the Sepolia network to continue.",
    },
  },
  solana: {
    networkName: "Solana Devnet",
    sepoliaNetwork: "Ethereum Sepolia",
    wallet: {
      notDetected: "No Solana wallet detected in this browser.",
      installPhantom: "Install Phantom",
      connect: "Connect Phantom",
      connecting: "Connecting…",
      connectionRejected: "Connection rejected in the wallet.",
      copyAddress: "Copy address",
      disconnect: "Disconnect",
      network: "Solana Devnet",
      solBalance: (sol: string) => `Test SOL balance (network fees): ${sol} SOL.`,
      faucetSol: "Get test SOL (faucet.solana.com)",
      networkNote:
        "The wallet only signs: the site sends the transaction through Solana devnet, regardless of the network selected in Phantom.",
    },
    invest: {
      realNotice:
        "Real on Solana Devnet. No market value is involved (MockBRL is a test token, with no backing), but each transaction below is actually signed and confirmed on the network, by the niara-pmes-solana program — it isn't a product simulation.",
      requirements: [
        "Phantom (or another compatible Solana wallet) installed and connected.",
        "A little test SOL for network fees and account rent — get it at faucet.solana.com (devnet).",
        "Test MockBRL — you can get it below, directly with the connected wallet.",
      ],
      termsTitle: "2. Offering terms (read directly from the program)",
      nonexistentOffering:
        "This offering doesn't exist in the niara-pmes-solana program on this network — check whether the program has been deployed to devnet.",
      noWallet: "Connect your Solana wallet to see your balance, your position and invest in this offering.",
      offeringAccount: "Offering account (niara-pmes-solana program)",
      noFee: "No fee in this offering (taxa_bps = 0, read directly from the program).",
      paused: "paused by the platform",
      pausedText: "This offering is paused by the platform — investments are blocked for now.",
      faucet: {
        title: "1. Get test MockBRL",
        description:
          "MockBRL on Solana is a test SPL token, with no backing and no value. The program's own faucet mints up to 1,000,000 mBRL per call to the signing wallet.",
      },
      noApprove:
        "On Solana there is no separate approval (approve): the investment is a single transaction, signed by you, that transfers the MockBRL straight into the offering's escrow.",
      invalidQuantity: "Enter a valid number of shares.",
      exceedsCapacity: (remaining: string) => `This amount exceeds the offering's remaining capacity (${remaining}).`,
      exceedsCap: (remaining: string) =>
        `This amount exceeds the cap per investor (${remaining} remaining) — it only goes through if this wallet is flagged as a qualified investor in the program.`,
      insufficientBalance: "Insufficient MockBRL balance — use the faucet above.",
      deadlinePassed: "This offering's deadline has already ended — it no longer accepts investments. It can be closed.",
      offeringClosedFailure:
        "This offering closed without reaching the minimum target — investing is no longer possible. If you invested, request a refund below.",
      refundedLabel: "Investment refunded",
      sharesFrozen:
        "Your shares sit in a token account frozen by the program: they show up in your wallet, but can't be transferred (there's no secondary market yet).",
      closeDescription:
        "In the program, closing is permissionless: any wallet can close it as soon as the deadline ends or the total raised hits the maximum target exactly — no investor is held hostage by the platform. In this interface, for now, the button is available to the Niara team and to the issuing company itself.",
      closeNotYet: "It can't be closed yet: the deadline hasn't ended and the maximum target hasn't been reached.",
      redeemDescription: (shares: string, symbol: string) =>
        `The fundraising closed successfully. Redeem (once) the ${shares} ${symbol} shares corresponding to your investment.`,
      refund: {
        title: "Refund",
        description: (value: string) =>
          `The fundraising didn't reach the minimum target. The escrow returns exactly what you invested: ${value}.`,
        button: "Request refund",
        success: "Refund confirmed on-chain.",
      },
      releaseDescription:
        "Transfers (once, permissionless in the program) the amount raised to the issuer, minus the platform fee, which goes to the protocol wallet. Without this instruction, the money stays locked in escrow. In this interface, for now, the button is only available to the Niara team.",
      releaseSuccess: "Funds released on-chain.",
      signing: "Waiting for signature in Phantom…",
      confirming: "Confirming on the network…",
      viewOnExplorer: "view on Solana Explorer",
    },
    publish: {
      networkChoice: {
        title: "Which network to publish on?",
        text:
          "The same offering can be published on Ethereum Sepolia (MetaMask) or on Solana Devnet (Phantom) — CVM Resolution 88 rules are checked again by the contract/program on both. Pick one: once published, the offering's network doesn't change.",
        sepolia: "Ethereum Sepolia",
        solana: "Solana Devnet",
      },
      subtitle:
        "Go through the checklist, review the data that goes to Solana Devnet and sign with your own Phantom wallet.",
      banner: "real publication on Solana Devnet. A test network with no real value; read the terms before signing.",
      noLinkedWallet: {
        title: "No Solana wallet linked to your account",
        text: "Before publishing, go to Profile and link the Phantom wallet that will sign on behalf of this company.",
        link: "Go to Profile →",
      },
      gates: {
        provider: {
          label: "Phantom wallet detected",
          rejected: "No Solana wallet was detected in this browser — install Phantom to continue.",
        },
        connection: {
          label: "Phantom connected",
          rejected: "Connect Phantom above.",
        },
        balance: {
          label: "Enough SOL balance for account rent and the fee",
          loading: "Checking balance and cost on Solana Devnet…",
          error: "Couldn't check the balance right now — try again in a moment.",
          rejected: (balance: string, cost: string) =>
            `A balance of ${balance} SOL isn't enough for the estimated cost of ${cost} SOL (rent for the offering account, the shares mint and the escrow, plus the fee, with a margin). Get test SOL at faucet.solana.com.`,
          ok: (balance: string, cost: string) => `Balance of ${balance} SOL — estimated cost: ${cost} SOL (account rent + fee).`,
        },
        authorized: {
          label: "Wallet authorized by Niara in the niara-pmes-solana program",
          notConnected: "Connect Phantom to check the authorization.",
          rejected: "This wallet hasn't been authorized by Niara to publish offerings on Solana yet — talk to the team.",
          openOffering: "This wallet already has an open offering in the program — close it before publishing another one.",
          error: "Couldn't check the on-chain authorization right now — try again in a moment.",
        },
        ownership: {
          label: "The connected wallet is the Solana wallet linked to your account",
          noLinkedWallet: "No linked Solana wallet — see the notice above.",
          notConnected: "Connect Phantom to compare.",
          different: (linked: string, connected: string) =>
            `The Solana wallet linked to your account (${linked}) is different from the one connected now (${connected}). Switch accounts in Phantom or link the current one in Profile.`,
        },
        term: {
          label: "Publication terms accepted",
          rejected: "Fill in the token data and tick the terms box below before publishing.",
          limits: "Name up to 64 bytes, symbol up to 10 and series up to 16 (program limits).",
        },
      },
      form: {
        title: "Data that goes to the blockchain",
        notice:
          "These three fields are recorded forever in the offering account created by the niara-pmes-solana program — review them before signing.",
        name: "Offering name",
        symbol: "Shares symbol",
        series: "Series",
      },
      termText: {
        title: "Before publishing, read carefully",
        intro:
          "You're about to sign a real transaction on Solana Devnet, a test network, using your own Phantom wallet and paying the rent for the created accounts with test SOL. This action writes permanent data to a public blockchain — Niara doesn't sign for you and can't undo it afterwards.",
        items: [
          "It's a test network, with no real value. Devnet SOL and the MockBRL used in this demo have no backing and no financial value at all. No real money changes hands here.",
          "The record is public and permanent. Your company's name and this offering's terms (target, deadline, value per share) will be recorded on a public blockchain, visible to anyone on Solana Explorer — even after you delete your Niara PMEs account. Your CNPJ isn't recorded as text — only a hash of it, which can't be reversed to the original number.",
          "You pay your own costs. The transaction uses test SOL from your wallet for account rent and the fee — Niara doesn't cover or refund it.",
          "This is not a public offering of securities. Niara PMEs is not a platform authorized by the Brazilian Securities and Exchange Commission (CVM). Nothing here is a real investment offering, and the on-chain record doesn't replace the corporate books required by Law 6.404/76 nor a notary record.",
          "Once published, your offering may receive real test investments from other wallets — review the terms carefully before confirming.",
        ],
        checkbox: "I've read and understood the points above, and I want to go ahead with publishing on Solana Devnet.",
      },
      publication: {
        signing: "Waiting for your signature in Phantom…",
        registering: "Signature received — recording the attempt before sending…",
        confirming: "Transaction sent — waiting for confirmation on Solana Devnet…",
        pendingText:
          "The transaction was signed and recorded, but hasn't confirmed yet. This does NOT mean the offering is already published — come back here in a moment to check. If it doesn't reach the network within a few minutes, the attempt is discarded on its own and you can publish again.",
        viewOnExplorer: "View on Solana Explorer →",
        confirmedTitle: "Published on Solana Devnet",
        confirmedText: "Your offering was confirmed on-chain. Accounts created by the program:",
        contractLabel: "Offering (program account, with escrow)",
        tokenLabel: "Shares mint (SPL)",
        verifyConsistencyNote:
          "Re-reads the offering account (minimum target, maximum target, price per share and deadline) and compares it with this offering in Supabase right now — it doesn't fix either side, it only flags.",
        viewOffering: "View the offering in the showcase →",
      },
    },
    profile: {
      title: "Solana wallet",
      subtitle:
        "Real connection to Phantom on Solana Devnet. Linking the wallet lets you publish offerings on Solana on behalf of your company.",
      linkTitle: "Link to the profile",
      explanation:
        "To link it, Phantom asks you to sign a message (no transaction and no cost) that proves the wallet is yours. The address is saved to your account, separately from the MetaMask wallet.",
      linkedLabel: "Linked to the profile",
      connectedNowLabel: "Connected now",
      none: "None",
      linkButton: "Link this wallet",
      switchButton: "Switch to this wallet",
      unlinkButton: "Unlink",
      signing: "Waiting for signature…",
      signatureRefused: "Signature refused in the wallet — nothing was saved.",
      noSignMessage: "This wallet doesn't support signing messages — use Phantom.",
      successLinked: "Solana wallet linked to your account.",
      successUnlinked: "Solana wallet unlinked.",
      connectToLink: "Connect Phantom above to link it.",
    },
    investPage: {
      title: "Real investment — Solana Devnet",
      subtitle:
        "This offering lives in the niara-pmes-solana program, on Solana devnet: MockBRL has no value at all, but the signatures, the transactions and the program state are real on-chain — unlike the rest of the platform, which is demo/mock.",
    },
    selector: {
      provenanceDemo: "Fictitious demo company",
      provenanceSelfService: "Data provided by the issuer itself (demo)",
    },
  },
  serverErrors: {
    fixFields: "Fix the highlighted fields.",
    moneyFormat: "Use the format 5.000.000,00.",
    moneyFormatLong: "Use the format 5.000.000,00 (digits only, dot as thousands separator and comma for decimals).",
    amountFormat: "Use the format 1.000,00.",
    invalidOffering: "Invalid offering.",
    offeringNotFound: "Offering not found.",
    invalidRole: "Invalid role.",
    issuersOnly: {
      createOfferings: "Only registered companies can create offerings.",
      activateOfferings: "Only registered companies can activate offerings.",
      closeFundraising: "Only registered companies can close fundraising rounds.",
      publish: "Only registered companies can publish offerings.",
      confirm: "Only registered companies can confirm publications.",
      verify: "Only registered companies can check publications.",
      uploadLogo: "Only companies can upload a logo.",
      removeLogo: "Only companies can remove the logo.",
      uploadBanner: "Only companies can upload a banner.",
      removeBanner: "Only companies can remove the banner.",
    },
    investorsOnly: {
      reserve: "Only registered investors can reserve investments.",
      confirmPayment: "Only registered investors can confirm payments.",
      kyc: "Only registered investors can submit KYC.",
    },
    address: {
      phone: "Invalid phone number.",
      cep: "Invalid CEP.",
      street: "Enter the street.",
      number: "Enter the number.",
      district: "Enter the neighborhood.",
      city: "Enter the city.",
      state: "Select the state.",
    },
    person: {
      fullName: "Enter your full name.",
      cpf: "Invalid CPF — enter the 11 digits.",
      birthDate: "Invalid date of birth.",
    },
    company: {
      legalName: "Enter the legal name.",
      cnpj: "Invalid CNPJ — enter the 14 digits.",
      revenueRequired: "Enter the gross annual revenue.",
      sepCap: "Gross revenue above the SEP's R$40 million limit (CVM Resolution 88).",
      sepCapField: "Above the R$40 million limit.",
    },
    signUpFailed: "We couldn't complete the registration. Please try again in a moment.",
    profileSaveFailed: "We couldn't save your data. Please try again in a moment.",
    wallet: {
      invalidAddress: "Invalid wallet address.",
      alreadyLinked: "This wallet is already linked to another account.",
      saveFailed: "We couldn't save the wallet. Please try again in a moment.",
      unlinkFailed: "We couldn't unlink the wallet. Please try again in a moment.",
    },
    upload: {
      selectImage: "Select an image file.",
      invalidFormat: "Invalid format — upload a JPG, PNG or WebP file.",
      maxSize: (megabytes: number) => `The image must be at most ${megabytes}MB.`,
      logoUploadFailed: "We couldn't upload the logo. Please try again in a moment.",
      logoSaveFailed: "We couldn't save the logo. Please try again in a moment.",
      logoRemoveFailed: "We couldn't remove the logo. Please try again in a moment.",
      bannerUploadFailed: "We couldn't upload the banner. Please try again in a moment.",
      bannerSaveFailed: "We couldn't save the banner. Please try again in a moment.",
      bannerRemoveFailed: "We couldn't remove the banner. Please try again in a moment.",
    },
    solanaLink: {
      invalidAddress: "Invalid Solana wallet address.",
      invalidData: "Invalid link data.",
      invalidMessage: "Invalid link message — try linking again.",
      expired: "The link signature expired — try linking again.",
      signatureMismatch: "The signature doesn't match this wallet — the link wasn't saved.",
      alreadyLinked: "This Solana wallet is already linked to another account.",
    },
    invest: {
      amountRequired: "Enter the investment amount.",
      annualLimit: "This investment goes over your annual investment limit.",
      capReached: "The offering has no room for this amount (cap reached).",
      notOpen: "This offering isn't open for reservations.",
      reserveFailed: "We couldn't complete the reservation. Please try again in a moment.",
      ownOffering: "You can't invest in your own offering.",
      kycRequired: "Get your KYC (demo) approved to confirm the payment.",
      confirmFailed: "We couldn't confirm the payment. Please try again in a moment.",
      invalidInvestment: "Invalid investment.",
      investmentNotFound: "Investment not found.",
      alreadyPaid: "Payment (simulated) already confirmed.",
      paid: "Payment (simulated) confirmed.",
    },
    kyc: {
      submitFailed: "We couldn't submit the KYC. Please try again in a moment.",
      completeFailed: "We couldn't complete the KYC. Please try again in a moment.",
    },
    offerings: {
      valueRequired: "Enter the offering value.",
      minTargetRequired: "Enter the minimum target.",
      valuePerShareRequired: "Enter the value per share.",
      selectCategory: "Select a category.",
      capAbove15m: "The offering value (with the additional lot) is above the R$15 million cap per offering.",
      lotAbove25: "The additional lot is above 25% of the original offering.",
      windowAbove180: "The offering's deadline is above 180 days.",
      minAboveCap: "The minimum target can't exceed the offering cap.",
      notMultiple: "The offering value must be a multiple of the value per share.",
      notMultipleField: "The offering value must be a multiple of this value.",
      operationFailed: "We couldn't complete the operation. Please try again in a moment.",
      onlyDraftActivate: "Only draft offerings can be activated.",
      activateFailed: "We couldn't activate it — check whether the offering is still a draft.",
      alreadyClosed: "This offering has already been closed.",
      closeFailed: "We couldn't close the fundraising. Please try again in a moment.",
      issuanceFailed: "We couldn't complete the token issuance. Please try again in a moment.",
    },
    publication: {
      invalidTxHash: "Invalid transaction hash.",
      invalidSignature: "Invalid transaction signature.",
      invalidData: "Invalid data to record the publication.",
      attemptFailed: "We couldn't record the publication attempt.",
      noLinkedWallet: "No wallet linked to this account — the publication can't be recorded.",
      noLinkedSolanaWallet: "No Solana wallet linked to this account — the publication can't be recorded.",
      attemptInProgress: "There's already a publication attempt in progress for this offering.",
      publishedOnSolana: "This offering was published on Solana Devnet, not on Sepolia.",
      notOnSolana: "This offering wasn't published on Solana.",
      notPending: "This offering doesn't have a pending publication.",
      noFrozenWallet: "This offering has no frozen expected wallet — it can't be confirmed.",
      contractNotConfigured: "Contract not configured.",
      noOrchestratorEvent: "No event emitted by the OfertaOrquestrador address was found in this receipt.",
      wrongEvent: "The event emitted by OfertaOrquestrador in this receipt isn't OfertaCompletaCriada.",
      eventMismatch: "The on-chain event parameters don't match this offering's (or the linked wallet's) in Supabase.",
      eventMismatchSolana:
        "The on-chain event parameters don't match this offering's (or the linked Solana wallet's) in Supabase.",
      notInFactories: "The event's token/offering isn't registered in the OfertaOrquestrador factories.",
      saveFailed: "The transaction confirmed on-chain, but it couldn't be saved to the database — try again.",
      revertUndecodable: "The transaction reverted on-chain, but the reason couldn't be decoded (unexpected calldata).",
      revertNotReproduced:
        "The transaction reverted on-chain, but the new simulation didn't reproduce the reason now — it may have been a temporary condition.",
      notConfirmedYet: "This offering doesn't have a confirmed publication to check yet.",
      consistencyDrift: (diffs: string) => `Consistency discrepancy (Supabase changed after the confirmation) — ${diffs}.`,
      diffMinTarget: (supabase: string, onchain: string) => `minimum target: Supabase ${supabase} ≠ on-chain ${onchain}`,
      diffHardCap: (supabase: string, onchain: string) => `hard cap: Supabase ${supabase} ≠ on-chain ${onchain}`,
      diffSharePrice: (supabase: string, onchain: string) => `value per share: Supabase ${supabase} ≠ on-chain ${onchain}`,
      diffDeadline: (supabase: string, onchain: string) => `deadline: Supabase ${supabase} ≠ on-chain ${onchain}`,
      solanaExpired: "The transaction didn't reach the network before expiring (nothing was recorded on-chain) — you can publish again.",
      noOfferingCreatedEvent: "No OfertaCriada event emitted by the niara-pmes-solana program was found in this transaction.",
      multipleEvents: "More than one OfertaCriada event in this transaction — exactly one was expected.",
      txBeforeAttempt: "The transaction predates this publication attempt — it doesn't belong to this offering.",
      cnpjMismatch: "The CNPJ (hash) recorded in the on-chain offering isn't this company's.",
      accountMismatch:
        "The offering account cited in the event doesn't exist on the network, doesn't belong to the niara-pmes-solana program or doesn't match the event.",
      accountNotFoundNow: "The offering account wasn't found on the network right now — try again in a moment.",
    },
  },
  chainErrors: {
    evm: {
      custom: {
        AporteNaoMultiploDoPreco: "The amount must be an exact multiple of the price per share.",
        EncerramentoPrematuro: "The offering can't be closed yet — it still needs to reach the deadline or the exact maximum target.",
        EnforcedPause: "Investments in this offering are paused right now.",
        ExcedeMetaMaxima: "This amount would exceed the offering's maximum target.",
        ExcedeTetoInvestidor: "This amount would exceed this offering's cap per investor.",
        JaReembolsado: "This investment has already been refunded.",
        JaResgatado: "You've already redeemed the shares for this investment.",
        NadaAReembolsar: "There's nothing to refund for this wallet.",
        NadaAResgatar: "There are no shares to redeem for this wallet.",
        NaoAutorizado: "This wallet isn't authorized to perform this action.",
        OfertaNaoAberta: "The offering isn't open for investments right now.",
        OfertaNaoEncerradaComFalha: "The offering didn't close as a failure.",
        OfertaNaoEncerradaComSucesso: "The offering hasn't closed successfully yet — close it before redeeming.",
        PrazoExpirado: "This offering's deadline has already passed.",
        RecursosJaLiberados: "This offering's funds have already been released to the issuer.",
        ERC20InsufficientAllowance: "Insufficient MockBRL allowance — try approving again.",
        "0xfb8f41b2":
          "Insufficient MockBRL allowance for this offering — approve the amount before trying the investment again.",
        ERC20InsufficientBalance: "Insufficient MockBRL balance for this operation.",
        ZeroAddress: "Invalid contract configuration — let Niara know.",
        EmissorNaoAutorizado: "Your wallet isn't authorized to publish offerings yet — talk to Niara to get access.",
        OfertaAnteriorAindaAberta: "You already have an open offering on Sepolia — close it before publishing a new one.",
        PrecoInvalido:
          "The value per share can't be zero — this offering needs to be recreated with a valid value per share; publishing again will revert the same way.",
        PrazoInvalido:
          "The offering's deadline must be in the future — this offering needs to be recreated with a valid deadline; publishing again will revert the same way.",
        PrazoExcedeLimite:
          "The offering's deadline exceeds CVM Resolution 88's 180-day limit — this offering needs to be recreated with a valid deadline; publishing again will revert the same way.",
        MetaMaximaExcedeTeto:
          "The offering value exceeds the R$15 million cap per offering (CVM Resolution 88) — this offering needs to be recreated with a valid cap; publishing again will revert the same way.",
        LoteAdicionalExcedeLimite:
          "The additional lot exceeds 25% of the offering's base value (CVM Resolution 88) — this offering needs to be recreated with a valid additional lot; publishing again will revert the same way.",
        PrecoNaoDivideMetaMaxima:
          "The offering value must be an exact multiple of the value per share — this offering needs to be recreated with compatible values; publishing again will revert the same way.",
        TaxaExcedeMaximo: "Invalid platform fee configuration — let Niara know.",
      },
      userRejected: "You cancelled the signature in the wallet.",
      revertedNamed: (errorName: string) => `The transaction reverted (${errorName}).`,
      reverted: (detail: string | null) =>
        `The transaction reverted on-chain${detail ? `: ${detail}` : " (reason not identified by the ABI)"}.`,
      insufficientEth: "Not enough Sepolia ETH to pay the gas for this transaction.",
      rpcUnavailable: "Couldn't reach the Sepolia RPC. Please try again in a moment.",
      unknown: "Unknown error while processing the transaction.",
      approveReverted: "The MockBRL approval (approve) reverted on-chain — the investment wasn't attempted.",
      contractNotConfigured: "Contract not configured.",
    },
    solana: {
      custom: {
        NaoAutorizado: "Only the program admin can perform this action.",
        TaxaAcimaDoMaximo: "Fee above 1% (100 bps).",
        FaucetInvalido: "The faucet amount must be greater than zero and at most 1,000,000 mBRL.",
        EmissorNaoAutorizado:
          "This wallet isn't authorized as an issuer in the program yet — ask the Niara team to authorize it.",
        OfertaAnteriorAindaAberta: "This wallet already has an open offering on Solana — close it before publishing another one.",
        MetadadosInvalidos: "Invalid name, symbol, company or series.",
        MetasInvalidas: "The minimum target must be greater than zero and no larger than the maximum target.",
        PrecoInvalido: "The price per share must be greater than zero.",
        PrazoExcedeLimite: "Deadline in the past or more than 180 days away (CVM Res. 88).",
        MetaMaximaExcedeTeto: "Maximum target above R$ 15 million (CVM Res. 88).",
        LoteAdicionalExcedeLimite: "Additional lot above 25% of the minimum target (CVM Res. 88).",
        PrecoNaoDivideMetaMaxima: "The value per share must divide the maximum target exactly.",
        OfertaNaoAberta: "This offering is no longer open.",
        OfertaPausada: "This offering is paused by the platform — investments are blocked for now.",
        PrazoExpirado: "This offering's deadline has already ended — it no longer accepts investments.",
        AporteNaoMultiploDoPreco: "The investment must be an exact multiple of the price per share.",
        ExcedeMetaMaxima: "This investment exceeds the offering's maximum target.",
        ExcedeTetoInvestidor: "This investment exceeds this offering's cap per investor.",
        EncerramentoPrematuro: "Closing before the deadline is only possible if the maximum target was hit exactly.",
        OfertaNaoSucedida: "The offering didn't close successfully.",
        OfertaNaoFalhou: "The offering didn't close as a failure.",
        NadaAResgatar: "There are no shares to redeem for this wallet.",
        CotasJaResgatadas: "The shares for this investment have already been redeemed.",
        RecursosJaLiberados: "This offering's funds have already been released.",
        NadaAReembolsar: "There's nothing to refund for this wallet.",
        JaReembolsado: "This investment has already been refunded.",
        Overflow: "Arithmetic overflow in the program.",
      },
      signatureRejected: "Signature refused in the wallet.",
      insufficientMockBrl: "Insufficient MockBRL balance — use the faucet above.",
      insufficientSol: "Not enough SOL to pay the network fee — get test SOL at faucet.solana.com (devnet).",
      expired: "The transaction expired before being confirmed — try again.",
      networkUnavailable: "Couldn't reach the Solana network (devnet) right now — try again in a few seconds.",
      noWallet: "No Solana wallet found. Install Phantom.",
      notConnected: "Connect the Solana wallet (Phantom) to continue.",
      noSignature: "The wallet didn't return the transaction signature.",
      notConnectedPublish: "Connect the Solana wallet (Phantom) to publish.",
      issuerNotAuthorized: "This wallet isn't authorized as an issuer in the niara-pmes-solana program.",
    },
  },
  partners: {
    meta: { title: "Partners" },
    login: {
      title: "Partners area",
      subtitle: "Internal, restricted access. Sign in with your registered account.",
      emailLabel: "Email",
      passwordLabel: "Password",
      signInButton: "Sign in",
      signingInButton: "Signing in…",
      errors: {
        invalidCredentials: "Incorrect email or password.",
        generic: "Couldn't sign in. Please try again.",
      },
    },
    denied: {
      title: "Restricted access",
      subtitle: "This account isn't authorized to view the partners dashboard.",
    },
    banner: {
      label: "Internal area",
      text: "admin dashboard for the partners — not meant for end investors, never accessible outside the allowlist.",
    },
    title: "Partners dashboard",
    loggedInAs: "Signed in as",
    origin: {
      real: "Real Sepolia",
      mock: "Demo/mock",
    },
    realSummary: {
      title: "Summary — real Sepolia",
      totalRaised: "Total raised (all offerings)",
      uniqueWallets: "Unique wallets that invested",
      configuredRate: "Configured fee rate",
      zeroFeeNote: "taxaBps = 0 in every offering today, read directly from the contract — no fee is charged on them.",
      feeRevenue: "Platform revenue (fee)",
      feeRevenueNote:
        "Real sum of RecursosLiberados.taxa already transferred to protocoloWallet via liberarParaEmissor() — testnet mBRL, not real currency. Never a projected value.",
      variableFee: "Varies by offering",
      configuredOfferings: "Configured offerings",
      notConfigured: "No on-chain offering configured (NEXT_PUBLIC_OFERTAS_ONCHAIN missing).",
      loading: "Reading on-chain events (Sepolia)... this may take a while without a dedicated RPC.",
      loadingError: "Couldn't read the on-chain data right now (slow or unavailable RPC). Try refreshing the page in a moment.",
    },
    mockSummary: {
      title: "Summary — Demo/mock (Supabase)",
      totalPaid: "Total paid (status paid/settled)",
      uniqueInvestors: "Unique investors",
      noFeeNote: "This simulated flow has no fee concept in the schema — not shown.",
    },
    realTable: {
      title: "Real transactions (Sepolia)",
      colType: "Type",
      colInvestor: "Wallet",
      colValue: "Amount",
      colDate: "Date",
      colTx: "Transaction",
      empty: "No on-chain events yet.",
      types: {
        Aporte: "Investment",
        OfertaEncerrada: "Offering closed",
        OfertaCancelada: "Offering cancelled",
        CotasResgatadas: "Shares redeemed",
        RecursosLiberados: "Funds released",
        Reembolso: "Refund",
      },
    },
    mockTable: {
      title: "Demo transactions (Supabase)",
      colIssuer: "Issuer",
      colInvestor: "Investor",
      colValue: "Amount",
      colStatus: "Status",
      colDate: "Date",
      empty: "No demo transactions yet.",
      status: {
        reserved: "Reserved",
        paid: "Paid (simulated)",
        settled: "Settled",
        refunded: "Refunded",
        cancelled: "Cancelled",
      },
    },
    transactions: {
      title: "All activity",
      subtitle:
        "A single timeline with everything that happens on the site — real on-chain events (Sepolia) and off-chain activity (sign-ups, offerings, investments, payments), most recent first.",
      summaryTitle: "Aggregate summary",
      loading: "Reading activity (on-chain + Supabase)... this may take a while without a dedicated RPC.",
      colOrigin: "Origin",
      colType: "Type",
      colActor: "Who",
      colValue: "Amount",
      colDate: "Date",
      colLink: "Link",
      viewOnChain: "View on chain",
      empty: "No activity yet.",
    },
    activity: {
      investorSignup: "Investor sign-up",
      issuerSignup: "Issuer sign-up",
      offeringCreated: "Offering created",
      selfServiceConfirmed: "Self-service offering confirmed",
      selfServiceConfirmedSolana: "Self-service offering confirmed (Solana Devnet)",
      selfServiceTerms: (target: string, price: string, deadline: string) =>
        `Target: ${target} · Price/share: ${price} · Deadline: ${deadline}`,
      investment: (status: string) => `Investment — ${status}`,
      shares: (amount: string) => `${amount} shares`,
      paymentEvents: {
        escrow_intent: "Escrow started",
        payment_confirmed: "Payment confirmed (simulated)",
        release: "Funds released to the issuer",
        refund: "Refund",
        tokens_issued: "Tokens issued (simulated)",
      },
    },
  },
} as const satisfies Dictionary;
