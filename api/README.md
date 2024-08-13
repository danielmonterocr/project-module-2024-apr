# API endpoints

| HTTP Request | Endpoint                                                               | Action                                                                      |
|--------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| POST         | /api/users/register                                                    | Register new user                                                           |
| POST         | /api/users/login                                                       | Login existing user                                                         |
| GET          | /api/users/{user_id}                                                   | Retrieve details of a specific user                                         |
| PUT          | /api/users/{user_id}                                                   | Update details of a specific user                                           |
| DELETE       | /users/{user_id}                                                       | Delete a user                                                               |
| POST         | /api/listings                                                          | Create a new listing                                                        |
| POST         | /api/listings/sync                                                     | Import listings                                                             |
| GET          | /api/listings/{listing_id}                                             | Retrieve details of a specific listing                                      |
| PUT          | /api/listings/{listing_id}                                             | Update details of a specific listing                                        |
| DELETE       | /api/listings/{listing_id}                                             | Delete a listing                                                            |
| POST         | /api/bookings                                                          | Create a new booking                                                        |
| GET          | /api/listings/{booking_id}                                             | Retrieve details of a specific booking                                      |
| PUT          | /api/listings/{booking_id}                                             | Update details of a specific booking                                        |
| DELETE       | /api/listings/{booking_id}                                             | Delete a booking                                                            |
| GET          | /sensors/{sensor_id}                                                   | Retrieve details of a specific sensor                                       |
| GET          | /sensors/{sensor_id}/readings                                          | Retrieve sensor readings                                                    |
| GET          | /consumption?listing_id={listing_id}&start={start_time}&end={end_time} | Retrieve consumption data for a specific listing and time range             |
| GET          | /consumption/timeseries?listing_id={listing_id}&start={start_time}&end={end_time} | Retrieve consumption data for a specific listing and time range  |
| GET          | /reports/24h?booking_id={booking_id}                                   | Generate and retrieve a report for the past 24 hours for a specific listing |
| GET          | /reports/daily                                                         | Generate a daily report                                                     |
| GET          | /reports/stay                                                          | Generate an end-of-stay report                                              |
| POST         | /messages                                                              | Send a message to a visitor                                                 |

| **Endpoint**                              | **HTTP Method** | **Description**                                      |
|-------------------------------------------|-----------------|------------------------------------------------------|
| `/users`                                  | GET             | List all users                                       |
| `/users`                                  | POST            | Create a new user                                    |
| `/users/{user_id}`                        | GET             | Retrieve details of a specific user                  |
| `/users/{user_id}`                        | PUT             | Update details of a specific user                    |
| `/users/{user_id}`                        | DELETE          | Delete a user                                        |
| `/listings`                               | GET             | List all listings                                    |
| `/listings`                               | POST            | Create a new listing                                 |
| `/listings/{listing_id}`                  | GET             | Retrieve details of a specific listing               |
| `/listings/{listing_id}`                  | PUT             | Update details of a specific listing                 |
| `/listings/{listing_id}`                  | DELETE          | Delete a listing                                     |
| `/bookings`                               | GET             | List all bookings                                    |
| `/bookings`                               | POST            | Create a new booking                                 |
| `/bookings/{booking_id}`                  | GET             | Retrieve details of a specific booking               |
| `/bookings/{booking_id}`                  | PUT             | Update details of a specific booking                 |
| `/bookings/{booking_id}`                  | DELETE          | Delete a booking                                     |
| `/sensors`                                | GET             | List all sensors                                     |
| `/sensors/{sensor_id}`                    | GET             | Retrieve details of a specific sensor                |
| `/sensors/{sensor_id}/readings`           | GET             | Retrieve sensor readings                             |
| `/sensors/{sensor_id}/readings`           | POST            | Submit new sensor readings                           |
| `/reports/daily`                          | GET             | Generate a daily report                              |
| `/reports/stay`                           | GET             | Generate an end-of-stay report                       |
