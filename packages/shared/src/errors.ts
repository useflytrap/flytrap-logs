import { createHumanLogs } from "human-logs"

export const createError = createHumanLogs({
  events: {
    fix_type_event: "",
    config_invalid:
      "The configuration passed to `createFlytrapLogger` is invalid",
    encrypting_log_failed: "Encrypting your log failed",
    crypto_generate_key_failed: "Generating an RSA key pair failed",
    parsing_failed: {
      template: 'Parsing file "{fileNamePath}" failed.',
      params: { fileNamePath: "" },
    },
  },
  explanations: {
    // Request fail explanations
    api_unreachable: "because we could not reach the Flytrap API.",
    request_failed: {
      template:
        'because a {method} request to "{endpoint}" failed. Error: \n\n{error}\n',
      params: {
        method: "",
        endpoint: "",
        error: "",
      },
    },

    // Config error explanations
    encrypting_required_keys: {
      template:
        "because you passed in the key(s) {keys} to `encryptKeys`, which is a required key, meaning you cannot encrypt it.",
      params: {
        keys: "",
      },
    },
    encryption_enabled_without_pubkey:
      "because you have enabled encryption, but have not provided a public key.",

    // Encryption & decryption
    encrypt_failed_invalid_plaintext_type: {
      template:
        'because encrypting failed due to invalid plaintext type. Expected "string", received "{plaintext}".',
      params: {
        plaintext: "",
      },
    },
    encrypt_failed_invalid_key_type: {
      template:
        'because encrypting failed due to invalid public key type. Expected "string", received "{publicKey}".',
      params: {
        publicKey: "",
      },
    },
    decrypt_failed_invalid_ciphertext_type: {
      template:
        'because decrypting failed due to invalid ciphertext type. Expected "string", received "{ciphertext}".',
      params: {
        ciphertext: "",
      },
    },
    decrypt_failed_invalid_key_type: {
      template:
        'because decrypting failed due to invalid private key type. Expected "string", received "{privateKey}".',
      params: {
        privateKey: "",
      },
    },
    decode_base64_failed: {
      template:
        'because base64 decoding the value "{inputValue}" errored. Error: \n\n{decodeError}\n',
      params: {
        inputValue: "",
        decodeError: "",
      },
    },
    encode_base64_failed: {
      template:
        'because base64 encoding the value "{inputValue}" errored. Error: \n\n{encodeError}\n',
      params: {
        inputValue: "",
        encodeError: "",
      },
    },
    crypto_instance_not_found: {
      template:
        'because we could not find the crypto instance for the "{env}" environment. {error}',
      params: {
        env: "",
        error: "",
      },
    },
  },
  solutions: {
    // Config solutions
    add_pubkey: {
      template: `Add the \`publicKey\` config option to your \`createFlytrapLogger\` options.`,
      params: {},
    },
    read_config_docs: {
      template: "Refer to the configuration documentation.",
      params: {},
      actions: [
        {
          text: "Config docs",
          href: "https://docs.useflytrap.com/",
        },
      ],
    },
    // Generic solutions
    open_issue: {
      template:
        "If you think this error shouldn't be happening, open an issue on GitHub and provide the code that caused this error.",
      params: {},
      actions: [
        {
          text: "Open an issue",
          href: "https://github.com/useflytrap/flytrap-js/issues/new?assignees=skoshx&labels=bug&projects=&template=---bug-report.yml",
        },
      ],
    },
    join_discord: {
      template:
        "Our Discord server is the fastest way to get help with your problem.",
      params: {},
      actions: [
        {
          text: "Join our Discord",
          href: "https://discord.gg/tQaADUfdeP",
        },
      ],
    },
  },
})
