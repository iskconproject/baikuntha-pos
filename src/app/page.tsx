export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 to-saffron-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-saffron-800 mb-4">
          VaikunthaPOS
        </h1>
        <p className="text-saffron-600 text-lg">
          ISKCON Temple Point of Sale System
        </p>
        <div className="mt-8">
          <div className="inline-block bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600">
              System is being initialized...
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}