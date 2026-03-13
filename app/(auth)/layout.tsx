import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center ">
        {children}
      </div>
      
      {/* Imagen de portada */}
      <div className="hidden lg:flex lg:flex-1 relative">
        <Image
          src="/auth.png"
          alt="Portada de autenticación"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
