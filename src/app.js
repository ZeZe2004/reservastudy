(function () {
  "use strict";

  const rooms = [
    { id: "lounge", name: "Sala Lounge", capacity: 2, features: ["Silêncio", "Luz natural"], icon: "◒" },
    { id: "atelier", name: "Atelier", capacity: 4, features: ["Quadro branco", "Tomadas"], icon: "▤" },
    { id: "norte", name: "Sala Norte", capacity: 6, features: ["Ecrã", "Videoconferência"], icon: "▧" },
    { id: "jardim", name: "Sala Jardim", capacity: 8, features: ["Luz natural", "Mesa ampla"], icon: "⌂" }
  ];
  const sampleNames = ["Estudante A", "Estudante B", "Estudante C"];
  const domain = window.BookingDomain;
  const roomList = document.querySelector("#room-list");
  const form = document.querySelector("#booking-form");
  const dateInput = document.querySelector("#booking-date");
  const scheduleDate = document.querySelector("#schedule-date");
  const nameInput = document.querySelector("#student-name");
  const startInput = document.querySelector("#start-time");
  const endInput = document.querySelector("#end-time");
  const message = document.querySelector("#form-message");
  const reservationList = document.querySelector("#reservation-list");
  const countBadge = document.querySelector("#reservation-count");
  let selectedRoomId = rooms[0].id;
  let bookings = [];
  let storageAvailable = true;

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function createSampleBookings(date) {
    return [
      { id: "demo-lounge", roomId: "lounge", name: sampleNames[0], date, start: "09:00", end: "10:00", status: "booked", demo: true },
      { id: "demo-atelier", roomId: "atelier", name: sampleNames[1], date, start: "10:00", end: "12:00", status: "booked", demo: true },
      { id: "demo-norte", roomId: "norte", name: sampleNames[2], date, start: "15:00", end: "16:00", status: "booked", demo: true }
    ];
  }

  function isStoredBooking(value) {
    return value !== null
      && typeof value === "object"
      && typeof value.id === "string"
      && typeof value.roomId === "string"
      && typeof value.name === "string"
      && typeof value.date === "string"
      && typeof value.start === "string"
      && typeof value.end === "string"
      && (value.status === "booked" || value.status === "cancelled")
      && domain.isCalendarDate(value.date)
      && domain.minutesSinceMidnight(value.start) !== null
      && domain.minutesSinceMidnight(value.end) !== null;
  }

  function readBookings(today) {
    const saved = localStorage.getItem("reservastudy.bookings.v1");
    if (saved === null) {
      const samples = createSampleBookings(today);
      localStorage.setItem("reservastudy.bookings.v1", JSON.stringify(samples));
      return samples;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isStoredBooking)) {
      throw new Error("Os dados de reservas guardados têm um formato inválido.");
    }
    return parsed;
  }

  function displayError(error) {
    console.error("ReservaStudy:", error);
    storageAvailable = false;
    form.querySelector("button[type='submit']").disabled = true;
    message.textContent = "Não foi possível aceder às reservas guardadas neste dispositivo. Abre a app através de um servidor local e tenta novamente.";
    message.classList.add("is-error");
  }

  function roomById(roomId) {
    return rooms.find((room) => room.id === roomId);
  }

  function renderRooms() {
    roomList.replaceChildren();
    rooms.forEach((room) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `room-card${room.id === selectedRoomId ? " is-selected" : ""}`;
      button.dataset.roomId = room.id;
      button.setAttribute("aria-pressed", String(room.id === selectedRoomId));
      button.setAttribute("aria-label", `${room.name}, até ${room.capacity} pessoas`);

      const icon = document.createElement("span");
      icon.className = "room-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = room.icon;
      const title = document.createElement("strong");
      title.textContent = room.name;
      const capacity = document.createElement("span");
      capacity.className = "room-capacity";
      capacity.textContent = `Até ${room.capacity} pessoas`;
      const features = document.createElement("span");
      features.className = "room-features";
      features.textContent = room.features.join(" · ");
      const mark = document.createElement("span");
      mark.className = "room-check";
      mark.textContent = room.id === selectedRoomId ? "✓" : "+";
      mark.setAttribute("aria-hidden", "true");

      button.append(icon, title, capacity, features, mark);
      button.addEventListener("click", () => {
        selectedRoomId = room.id;
        roomList.querySelectorAll(".room-card").forEach((card) => {
          const selected = card.dataset.roomId === selectedRoomId;
          card.classList.toggle("is-selected", selected);
          card.setAttribute("aria-pressed", String(selected));
          card.querySelector(".room-check").textContent = selected ? "✓" : "+";
        });
        updateAvailability();
      });
      roomList.append(button);
    });
  }

  function renderReservations() {
    const date = scheduleDate.value;
    const visible = bookings
      .filter((booking) => booking.date === date && booking.status === "booked")
      .sort((first, second) => first.start.localeCompare(second.start));
    countBadge.textContent = String(visible.length);
    reservationList.replaceChildren();

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = '<span aria-hidden="true">✦</span><strong>Dia livre, mente tranquila.</strong><span>Ainda não há reservas nesta data.</span>';
      reservationList.append(empty);
      return;
    }

    visible.forEach((booking) => {
      const item = document.createElement("article");
      item.className = "reservation-card";
      const room = roomById(booking.roomId);
      const time = document.createElement("span");
      time.className = "reservation-time";
      time.textContent = `${booking.start} — ${booking.end}`;
      const title = document.createElement("strong");
      title.textContent = room ? room.name : "Sala indisponível";
      const student = document.createElement("span");
      student.className = "reservation-student";
      student.textContent = booking.name;
      const cancel = document.createElement("button");
      cancel.className = "cancel-button";
      cancel.type = "button";
      cancel.textContent = "Cancelar";
      cancel.setAttribute("aria-label", `Cancelar reserva ${room ? room.name : ""} das ${booking.start} às ${booking.end}`);
      cancel.addEventListener("click", () => cancelBooking(booking.id));
      item.append(time, title, student, cancel);
      reservationList.append(item);
    });
  }

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", Boolean(isError));
  }

  function cancelBooking(id) {
    const updated = bookings.filter((booking) => booking.id !== id);
    try {
      localStorage.setItem("reservastudy.bookings.v1", JSON.stringify(updated));
      bookings = updated;
      renderReservations();
      setMessage("Reserva cancelada com sucesso.", false);
    } catch (error) {
      console.error("ReservaStudy: não foi possível cancelar a reserva.", error);
      setMessage("Não foi possível guardar o cancelamento. Tenta novamente.", true);
    }
  }

  function updateAvailability() {
    if (!dateInput.value) {
      return;
    }
    const draft = {
      roomId: selectedRoomId,
      date: dateInput.value,
      start: startInput.value,
      end: endInput.value
    };
    const eligible = rooms.filter((room) => domain.validateBooking(
      { ...draft, roomId: room.id, name: "Estudante" },
      bookings,
      rooms,
      localDateString(new Date())
    ).valid);
    const selectedIsAvailable = eligible.some((room) => room.id === selectedRoomId);
    const helper = selectedIsAvailable
      ? `${eligible.length} ${eligible.length === 1 ? "sala livre" : "salas livres"} neste horário`
      : "Esta sala já está reservada nesse horário";
    document.querySelector(".form-footnote").textContent = `${helper} · Funcionamento: 08:00–21:00`;
  }

  function submitBooking(event) {
    event.preventDefault();
    if (!storageAvailable) {
      return;
    }
    const candidate = {
      id: window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      roomId: selectedRoomId,
      name: nameInput.value,
      date: dateInput.value,
      start: startInput.value,
      end: endInput.value,
      status: "booked",
      demo: false
    };
    const validation = domain.validateBooking(
      candidate,
      bookings,
      rooms,
      localDateString(new Date())
    );
    if (!validation.valid) {
      const firstError = validation.errors[0];
      const messages = {
        "invalid-name": "Indica o teu nome (até 80 caracteres).",
        "invalid-room": "Escolhe uma sala disponível.",
        "invalid-date": "Escolhe uma data válida.",
        "past-date": "A data da reserva não pode estar no passado.",
        "invalid-time": "O horário de fim tem de ser posterior ao início.",
        "outside-hours": "As reservas têm de estar entre as 08:00 e as 21:00.",
        "room-conflict": "Esta sala já está reservada nesse horário. Escolhe outra hora ou sala."
      };
      setMessage(messages[firstError], true);
      return;
    }
    candidate.name = validation.name;
    const updated = [...bookings, candidate];
    try {
      localStorage.setItem("reservastudy.bookings.v1", JSON.stringify(updated));
      bookings = updated;
      scheduleDate.value = candidate.date;
      renderReservations();
      setMessage(`Reserva confirmada: ${roomById(candidate.roomId).name}, ${candidate.start}–${candidate.end}.`, false);
      form.reset();
      nameInput.value = "";
      dateInput.value = localDateString(new Date());
      startInput.value = "14:00";
      endInput.value = "15:00";
      updateAvailability();
    } catch (error) {
      console.error("ReservaStudy: não foi possível guardar a reserva.", error);
      setMessage("Não foi possível guardar a reserva neste dispositivo. Tenta novamente.", true);
    }
  }

  function start() {
    const today = localDateString(new Date());
    dateInput.min = today;
    dateInput.value = today;
    scheduleDate.value = today;
    renderRooms();
    try {
      bookings = readBookings(today);
      renderReservations();
      updateAvailability();
    } catch (error) {
      displayError(error);
    }
    form.addEventListener("submit", submitBooking);
    scheduleDate.addEventListener("change", renderReservations);
    [dateInput, startInput, endInput].forEach((input) => input.addEventListener("change", updateAvailability));
  }

  start();
})();
