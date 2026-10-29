import { ref, onMounted } from "vue";

export type VoiceMode = "president" | "kasual" | "soundbox";

export function usePaymentAudio() {
  const isMuted = ref(false);
  const isPlaying = ref(false);
  const activeVoiceMode = ref<VoiceMode>("president");

  function formatNominalTerbilang(n: number): string {
    if (n === 0) return "nol";
    const satuan = [
      "",
      "satu",
      "dua",
      "tiga",
      "empat",
      "lima",
      "enam",
      "tujuh",
      "delapan",
      "sembilan",
      "sepuluh",
      "sebelas",
    ];

    if (n < 12) return satuan[n];
    if (n < 20) return `${formatNominalTerbilang(n - 10)} belas`;
    if (n < 100) {
      const sisa = n % 10;
      return `${satuan[Math.floor(n / 10)]} puluh${sisa ? " " + formatNominalTerbilang(sisa) : ""}`;
    }
    if (n < 200) {
      const sisa = n - 100;
      return `seratus${sisa ? " " + formatNominalTerbilang(sisa) : ""}`;
    }
    if (n < 1000) {
      const sisa = n % 100;
      return `${satuan[Math.floor(n / 100)]} ratus${sisa ? " " + formatNominalTerbilang(sisa) : ""}`;
    }
    if (n < 2000) {
      const sisa = n - 1000;
      return `seribu${sisa ? " " + formatNominalTerbilang(sisa) : ""}`;
    }
    if (n < 1000000) {
      const sisa = n % 1000;
      return `${formatNominalTerbilang(Math.floor(n / 1000))} ribu${sisa ? " " + formatNominalTerbilang(sisa) : ""}`;
    }
    if (n < 1000000000) {
      const sisa = n % 1000000;
      return `${formatNominalTerbilang(Math.floor(n / 1000000))} juta${sisa ? " " + formatNominalTerbilang(sisa) : ""}`;
    }
    return n.toLocaleString("id-ID");
  }

  function getSentence(amount: number, mode: VoiceMode): string {
    const terbilang = formatNominalTerbilang(amount);
    if (mode === "kasual") {
      if (amount >= 100000) {
        return `Waww!, sudah masuk ${terbilang} rupiah`;
      }
      return `Sudah masuk ${terbilang} rupiah`;
    }
    // soundbox mode
    return `Perhatian, pembayaran ${terbilang} rupiah diterima GoPay`;
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang === "id-ID" || v.lang.startsWith("id"));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  function getPresidentAudioTokens(amount: number): string[] {
    const terbilangWords = formatNominalTerbilang(amount)
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return ["intro", ...terbilangWords, "outro"];
  }

  async function playAudioItem(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio(src);
      audio.volume = 1.0;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
  }

  async function playPaymentSuccess(amount: number) {
    if (isMuted.value) return;
    isPlaying.value = true;

    try {
      if (activeVoiceMode.value === "president") {
        // 1. Putar Chime / SFX Notifikasi terlebih dahulu
        const sfx = new Audio("/audio/sfx-payment-recieve.opus");
        sfx.volume = 0.95;
        sfx.play().catch((err) => {
          console.warn("Autoplay SFX dicegah browser:", err);
        });

        // Jeda 850ms agar chime selesai berbunyi sebelum suara presiden masuk
        await new Promise((resolve) => setTimeout(resolve, 850));

        // 2. Putar Suara Presiden Dinamis (per token)
        const tokens = getPresidentAudioTokens(amount);
        let playedAnyToken = false;

        // Putar audio token satu per satu
        for (const token of tokens) {
          const success = await playAudioItem(`/audio/presiden/${token}.mp3`);
          if (success) {
            playedAnyToken = true;
          } else if (!playedAnyToken) {
            // Jika token pertama (intro) belum ada, fallback ke file audio tunggal
            break;
          }
        }

        // Fallback jika folder /audio/presiden/ belum di-split
        if (!playedAnyToken) {
          await playAudioItem("/audio/qris_president.mp3");
        }
        isPlaying.value = false;
      } else {
        // Mode Chime + TTS Suara Dinamis
        const sfx = new Audio("/audio/sfx-payment-recieve.opus");
        sfx.volume = 0.9;

        sfx.play().catch((err) => {
          console.warn("Autoplay dicegah browser:", err);
        });

        setTimeout(() => {
          const sentence = getSentence(amount, activeVoiceMode.value);
          speakText(sentence);
          isPlaying.value = false;
        }, 700);
      }
    } catch (err) {
      console.error("Gagal memutar audio notifikasi:", err);
      isPlaying.value = false;
    }
  }

  function setVoiceMode(mode: VoiceMode) {
    activeVoiceMode.value = mode;
    if (import.meta.client) {
      localStorage.setItem("gopay_voice_mode", mode);
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    if (import.meta.client) {
      localStorage.setItem("gopay_sound_muted", isMuted.value ? "true" : "false");
    }
  }

  function testSound(sampleAmount = 100000) {
    playPaymentSuccess(sampleAmount);
  }

  onMounted(() => {
    if (import.meta.client) {
      isMuted.value = localStorage.getItem("gopay_sound_muted") === "true";
      const savedMode = localStorage.getItem("gopay_voice_mode") as VoiceMode | null;
      if (savedMode && ["president", "kasual", "soundbox"].includes(savedMode)) {
        activeVoiceMode.value = savedMode;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
      }
    }
  });

  return {
    isMuted,
    isPlaying,
    activeVoiceMode,
    setVoiceMode,
    playPaymentSuccess,
    toggleMute,
    testSound,
  };
}
