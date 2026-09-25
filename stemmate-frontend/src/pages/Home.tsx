import Chat from "../components/Chat";

export default function Home() {
  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <h1>StemMate</h1>


      <hr />

      <Chat />
    </div>
  );
}