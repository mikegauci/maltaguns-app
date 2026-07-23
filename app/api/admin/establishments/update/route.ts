import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    console.log('Starting API endpoint execution')

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const {
      id,
      currentType,
      newType,
      name,
      location,
      logo_url,
      ...otherFields
    } = await req.json()

    console.log('Request data:', { id, currentType, newType, name, location })

    if (!id || !currentType || !newType || !name || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (currentType === newType) {
      const sourceTable = `${currentType}s`

      const nameField =
        currentType === 'store' || currentType === 'servicing'
          ? 'business_name'
          : 'name'

      const updateData: any = {
        location,
        logo_url: logo_url || null,
        ...otherFields,
      }

      updateData[nameField] = name

      console.log(`Updating ${sourceTable} with:`, updateData)

      const { error } = await supabaseAdmin
        .from(sourceTable)
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Update error:', error)
        return NextResponse.json(
          { error: `Failed to update: ${error.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Establishment updated successfully',
      })
    }

    const sourceTable =
      currentType === 'servicing' ? 'servicing' : `${currentType}s`
    const targetTable = newType === 'servicing' ? 'servicing' : `${newType}s`

    console.log(`Moving record from ${sourceTable} to ${targetTable}`)

    const sourceNameField =
      currentType === 'store' ||
      currentType === 'servicing' ||
      currentType === 'range'
        ? 'business_name'
        : 'name'

    const targetNameField =
      newType === 'store' ||
      newType === 'servicing' ||
      newType === 'club' ||
      newType === 'range'
        ? 'business_name'
        : 'name'

    console.log(
      `Source name field: ${sourceNameField}, Target name field: ${targetNameField}`
    )

    console.log(`Fetching current record from ${sourceTable} with ID: ${id}`)
    const { data: currentRecord, error: fetchError } = await supabaseAdmin
      .from(sourceTable)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching current record:', fetchError)
      return NextResponse.json(
        { error: `Failed to fetch record: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!currentRecord) {
      console.log(`No record found in ${sourceTable} with ID: ${id}`)
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    console.log('Current record:', currentRecord)

    const commonFields = {
      owner_id: currentRecord.owner_id,
      location: location || currentRecord.location,
      phone: currentRecord.phone,
      email: currentRecord.email,
      description: currentRecord.description,
      website: currentRecord.website,
      slug: currentRecord.slug,
      logo_url: logo_url !== undefined ? logo_url : currentRecord.logo_url,
      meta_title:
        otherFields.meta_title !== undefined
          ? otherFields.meta_title
          : currentRecord.meta_title,
      meta_description:
        otherFields.meta_description !== undefined
          ? otherFields.meta_description
          : currentRecord.meta_description,
      created_at: new Date().toISOString(),
    }

    if (newType !== 'club' && currentRecord.status) {
      commonFields['status' as keyof typeof commonFields] = currentRecord.status
    }

    const newRecord: any = {
      ...commonFields,
    }

    newRecord[targetNameField] = name

    console.log(`New record to insert into ${targetTable}:`, newRecord)

    console.log(`Inserting new record into ${targetTable}`)

    const { data: insertedRecord, error: insertError } = await supabaseAdmin
      .from(targetTable)
      .insert([newRecord])
      .select()

    if (insertError) {
      console.error('Error inserting new record:', insertError)
      return NextResponse.json(
        { error: `Failed to insert record: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('Successfully inserted new record:', insertedRecord)

    console.log(`Deleting old record from ${sourceTable} with ID: ${id}`)
    const { error: deleteError } = await supabaseAdmin
      .from(sourceTable)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting old record:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete old record: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('Successfully deleted old record')

    return NextResponse.json({
      success: true,
      message: `Establishment updated and moved to ${newType}`,
    })
  } catch (error: any) {
    console.error('Establishment update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update establishment' },
      { status: 500 }
    )
  }
}
